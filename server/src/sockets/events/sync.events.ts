import { AuthenticatedSocket } from '../../types/socket.types';
import { syncHandler } from '../../crdt/sync.handler';
import { documentManager } from '../../crdt/document.manager';
import logger from '../../utils/logger';

export const setupSyncEvents = (socket: AuthenticatedSocket): void => {
    socket.on('sync:update', (update: Uint8Array) => {
        try {
            if (!socket.user) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            const rooms = Array.from(socket.rooms as unknown as Set<string>);
            const documentRoom = rooms.find(room => room.startsWith('document:'));

            if (!documentRoom) {
                socket.emit('error', 'Not in a document room');
                return;
            }

            const documentId = documentRoom.replace('document:', '');

            if (!documentManager.getDocument(documentId)) {
                socket.emit('error', 'Document not found');
                return;
            }

            syncHandler.handleSyncUpdate(socket, documentId, update);

            logger.debug('Sync update processed', {
                userId: socket.user.userId,
                documentId,
                updateSize: update.length,
            });
        } catch (error) {
            logger.error('Sync update failed', {
                userId: socket.user?.userId,
                error: (error as Error).message,
            });
            socket.emit('error', (error as Error).message);
        }
    });

    socket.on('awareness:update', (update: Uint8Array) => {
        try {
            if (!socket.user) {
                socket.emit('error', 'Not authenticated');
                return;
            }

            const rooms = Array.from(socket.rooms as unknown as Set<string>);
            const documentRoom = rooms.find(room => room.startsWith('document:'));

            if (!documentRoom) {
                socket.emit('error', 'Not in a document room');
                return;
            }

            const documentId = documentRoom.replace('document:', '');

            syncHandler.handleAwarenessUpdate(socket, documentId, update);

            logger.debug('Awareness update processed', {
                userId: socket.user.userId,
                documentId,
                updateSize: update.length,
            });
        } catch (error) {
            logger.error('Awareness update failed', {
                userId: socket.user?.userId,
                error: (error as Error).message,
            });
            socket.emit('error', (error as Error).message);
        }
    });
};
