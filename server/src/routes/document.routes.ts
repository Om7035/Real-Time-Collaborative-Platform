import { Router, Request, Response } from 'express';
import { documentManager } from '../crdt/document.manager';
import { permissionService } from '../auth/permission.service';
import { authService } from '../auth/auth.service';
import { inviteService } from '../auth/invite.service';
import { UserRole } from '../types/document.types';
import logger from '../utils/logger';
import { authMiddleware } from '../middleware/auth.middleware';
import { DocumentModel } from '../db/models/document.model';
import { persistenceService } from '../crdt/persistence.service';
import { sessionManager } from '../session/session.manager';

// TODO: Refactor this entire file to use sessionManager primarily
// For now we add the new endpoint

export const openDocumentSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // NOTE: The middleware attaches `user: { userId: string, ... }`
        const userId = (req as any).user?.userId;

        logger.info(`[Session] Opening session...`, { documentId: id, requestingUserId: userId });

        // 1. Permission Check
        const doc = await DocumentModel.findById(id);
        if (!doc) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // Check if user is owner or collaborator
        const ownerIdString = doc.ownerId.toString();
        const isOwner = ownerIdString === userId;
        const isCollaborator = doc.collaborators?.some(c => c.userId?.toString() === userId);

        logger.info(`[Session] Permission check`, {
            documentOwnerId: ownerIdString,
            requestingUserId: userId,
            isOwner,
            isCollaborator
        });

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ success: false, error: 'Permission denied', detail: `Not owner (${ownerIdString} != ${userId})` });
        }

        // 2. Open Session
        const session = await sessionManager.openSession(id);

        return res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                documentId: session.documentId,
                role: isOwner ? 'owner' : (doc.collaborators.find(c => c.userId.toString() === userId)?.role || 'viewer')
            }
        });

    } catch (error) {
        logger.error('Failed to open document session:', error);
        return res.status(500).json({ success: false, error: 'Failed to open session' });
    }
};

const router = Router();

router.post('/:id/session', authMiddleware, openDocumentSession);

router.post('/create', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { title } = req.body;
        const userId = (req as any).user.userId;

        // 1. Create in DB first to get legitimate ObjectId
        const docModel = new DocumentModel({
            title: title || 'Untitled Document',
            ownerId: userId,
            collaborators: [],
            content: Buffer.from([]) // Empty Initial State
        });
        await docModel.save();

        const documentId = docModel._id.toString();

        // 2. Initialize In-Memory State with DB ID
        const metadata = documentManager.createDocument(documentId, userId, title);

        res.status(201).json({
            success: true,
            data: metadata,
        });
    } catch (error) {
        logger.error('Document creation failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.get('/', authMiddleware, (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const allDocs = documentManager.getAllDocuments();

        // Filter for docs where user is Owner OR Collaborator
        const accessibleDocs = allDocs.filter(doc =>
            permissionService.canView(userId, doc)
        );

        res.status(200).json({
            success: true,
            data: accessibleDocs,
        });
    } catch (error) {
        logger.error('Document list failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        // 1. Check Memory first
        let metadata = documentManager.getDocumentMetadata(id);

        if (!metadata) {
            // 2. Try loading from DB
            const loaded = await persistenceService.loadDocument(id);
            if (loaded) {
                metadata = documentManager.getDocumentMetadata(id);
            }
        }

        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        if (!permissionService.canView(userId, metadata)) {
            res.status(403).json({ success: false, error: 'Access denied' });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                ...metadata,
                currentUserRole: permissionService.getUserRole(userId, metadata)
            },
        });
    } catch (error) {
        logger.error('Document get failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.patch('/:id', authMiddleware, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title } = req.body;
        const userId = (req as any).user.userId;

        const metadata = documentManager.getDocumentMetadata(id);

        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        if (!permissionService.canEdit(userId, metadata)) {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
            return;
        }

        const updated = documentManager.updateDocumentMetadata(id, { title });

        res.status(200).json({
            success: true,
            data: updated,
        });
    } catch (error) {
        logger.error('Document update failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;
        const metadata = documentManager.getDocumentMetadata(id);

        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        if (!permissionService.canDelete(userId, metadata)) {
            res.status(403).json({ success: false, error: 'Only the owner can delete this document' });
            return;
        }

        documentManager.deleteDocument(id);

        res.status(200).json({
            success: true,
            message: 'Document deleted',
        });
    } catch (error) {
        logger.error('Document deletion failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// --- SHARING ENDPOINTS ---

router.post('/:id/invite', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body; // role should be 'editor' or 'viewer'
        const requesterId = (req as any).user.userId;

        const metadata = documentManager.getDocumentMetadata(id);
        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        // Only Owner can manage permissions
        if (!permissionService.canManage(requesterId, metadata)) {
            res.status(403).json({ success: false, error: 'Not authorized to invite users' });
            return;
        }

        const targetUser = await authService.findUserByEmail(email);

        if (!targetUser) {
            res.status(404).json({ success: false, error: 'User not found with this email' });
            return;
        }

        if (targetUser.id === metadata.ownerId) {
            res.status(400).json({ success: false, error: 'Cannot add owner as collaborator' });
            return;
        }

        documentManager.addCollaborator(id, targetUser.id, targetUser.email, role as UserRole);

        res.status(200).json({
            success: true,
            message: 'Collaborator added',
            data: documentManager.getDocumentMetadata(id)
        });

    } catch (error) {
        logger.error('Invite failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

router.delete('/:id/invite/:targetUserId', authMiddleware, (req: Request, res: Response) => {
    try {
        const { id, targetUserId } = req.params;
        const requesterId = (req as any).user.userId;

        const metadata = documentManager.getDocumentMetadata(id);
        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        // Owner can remove anyone. User can remove themselves (leave).
        const isOwner = permissionService.canManage(requesterId, metadata);
        const isSelf = requesterId === targetUserId;

        if (!isOwner && !isSelf) {
            res.status(403).json({ success: false, error: 'Not authorized' });
            return;
        }

        documentManager.removeCollaborator(id, targetUserId);

        res.status(200).json({
            success: true,
            message: 'Collaborator removed'
        });

    } catch (error) {
        logger.error('Remove collaborator failed', { error: (error as Error).message });
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Create Invite Link
router.post('/:id/invites', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { role, expiresIn, maxUses } = req.body;
        const userId = (req as any).user.userId;

        const metadata = documentManager.getDocumentMetadata(id);
        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        if (!permissionService.canManage(userId, metadata)) {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
            return;
        }

        // Default role to viewer if not specified, but usually UI sends it.
        // Validate role
        if (role && !Object.values(UserRole).includes(role)) {
            res.status(400).json({ success: false, error: 'Invalid role' });
            return;
        }

        const invite = inviteService.createInvite(
            id,
            userId,
            role || UserRole.VIEWER,
            expiresIn,
            maxUses
        );

        res.json({ success: true, data: invite });
    } catch (error) {
        logger.error('Failed to create invite', { error: (error as Error).message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// List Invites
router.get('/:id/invites', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        const metadata = documentManager.getDocumentMetadata(id);
        if (!metadata) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }

        if (!permissionService.canManage(userId, metadata)) {
            res.status(403).json({ success: false, error: 'Insufficient permissions' });
            return;
        }

        const invites = inviteService.getDocumentInvites(id);
        res.json({ success: true, data: invites });
    } catch (error) {
        logger.error('Failed to list invites', { error: (error as Error).message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
