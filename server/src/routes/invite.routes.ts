import { Router, Request, Response } from 'express';
import { inviteService } from '../auth/invite.service';
import { documentManager } from '../crdt/document.manager';
import logger from '../utils/logger';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get Invite Info (Public, but returns limited info)
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const check = await inviteService.validateInvite(id);

        if (!check.valid || !check.invite) {
            res.status(404).json({ success: false, error: check.error || 'Invite not found' });
            return;
        }

        const metadata = documentManager.getDocumentMetadata(check.invite.documentId);

        // Return safe info
        res.json({
            success: true,
            data: {
                inviterId: check.invite.createdBy,
                documentTitle: metadata?.title || 'Untitled Document',
                role: check.invite.role,
                valid: true
            }
        });
    } catch (error) {
        logger.error('Failed to get invite', { error: (error as Error).message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Accept Invite
router.post('/:id/accept', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;
        const email = (req as any).user.email;

        // 1. Accept structure (validates and increments count)
        const invite = await inviteService.acceptInvite(id);

        // 2. Add to document
        documentManager.addCollaborator(
            invite.documentId,
            userId,
            email,
            invite.role
        );

        res.json({
            success: true,
            data: {
                documentId: invite.documentId,
                role: invite.role
            }
        });
    } catch (error) {
        logger.error('Failed to accept invite', { error: (error as Error).message });
        res.status(400).json({ success: false, error: (error as Error).message });
    }
});

// Revoke (Owner only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        const invite = await inviteService.getInvite(id);
        if (!invite) {
            res.status(404).json({ success: false, error: 'Invite not found' });
            return;
        }

        // Check ownership of document
        const metadata = documentManager.getDocumentMetadata(invite.documentId);
        if (!metadata || metadata.ownerId !== userId) {
            res.status(403).json({ success: false, error: 'Not authorized to revoke this invite' });
            return;
        }

        await inviteService.revokeInvite(id);
        res.json({ success: true, message: 'Invite revoked' });
    } catch (error) {
        logger.error('Failed to revoke invite', { error: (error as Error).message });
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

export default router;
