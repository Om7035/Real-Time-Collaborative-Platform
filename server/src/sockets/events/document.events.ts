import { AuthenticatedSocket, JoinResponse } from '../../types/socket.types';
import { syncHandler } from '../../crdt/sync.handler';
import { documentManager } from '../../crdt/document.manager';
import logger from '../../utils/logger';
import { permissionService } from '../../auth/permission.service';

import { persistenceService } from '../../crdt/persistence.service';

export const setupDocumentEvents = (socket: AuthenticatedSocket): void => {
    socket.on('document:join', async (documentId: string, callback: (response: JoinResponse) => void) => {
        try {
            if (!socket.user) {
                callback({ success: false, error: 'Not authenticated' });
                return;
            }

            let metadata = documentManager.getDocumentMetadata(documentId);

            // Lazy load if not in memory
            if (!metadata) {
                const loaded = await persistenceService.loadDocument(documentId);
                if (loaded) {
                    metadata = documentManager.getDocumentMetadata(documentId);
                }
            }

            if (!metadata) {
                callback({ success: false, error: 'Document not found' });
                return;
            }

            // PERMISSION CHECK
            const userId = socket.user.userId;
            const role = permissionService.getUserRole(userId, metadata);

            if (!role) {
                callback({ success: false, error: 'Access denied' });
                return;
            }

            const { state, awareness } = syncHandler.handleDocumentJoin(socket, documentId);

            callback({ success: true, state, awareness, role });

            logger.info('Document join successful', {
                userId,
                documentId,
                role
            });
        } catch (error) {
            logger.error('Document join failed', {
                userId: socket.user?.userId,
                documentId,
                error: (error as Error).message,
            });
            callback({ success: false, error: (error as Error).message });
        }
    });

    socket.on('document:leave', (documentId: string) => {
        try {
            if (!socket.user) {
                return;
            }

            syncHandler.handleDocumentLeave(socket, documentId);

            logger.info('Document leave successful', {
                userId: socket.user.userId,
                documentId,
            });
        } catch (error) {
            logger.error('Document leave failed', {
                userId: socket.user?.userId,
                documentId,
                error: (error as Error).message,
            });
        }
    });

    socket.on('disconnect', () => {
        logger.info('Socket disconnected', {
            socketId: socket.id,
            userId: socket.user?.userId,
        });
    });
};
