
import * as awarenessProtocol from 'y-protocols/awareness';
import { AuthenticatedSocket } from '../types/socket.types';
import { documentManager } from './document.manager';
import { getRoomName } from '../utils/helpers';
import logger from '../utils/logger';
import { permissionService } from '../auth/permission.service';

export class SyncHandler {
    private awarenessStates: Map<string, awarenessProtocol.Awareness> = new Map();

    handleDocumentJoin(socket: AuthenticatedSocket, documentId: string): { state: Uint8Array, awareness: Uint8Array } {
        const ydoc = documentManager.getDocument(documentId);
        if (!ydoc) {
            throw new Error('Document not found');
        }

        const roomName = getRoomName(documentId);
        socket.join(roomName);

        let awareness = this.awarenessStates.get(documentId);
        if (!awareness) {
            awareness = new awarenessProtocol.Awareness(ydoc);
            this.awarenessStates.set(documentId, awareness);
        }

        logger.info('User joined document', {
            userId: socket.user?.userId,
            documentId,
            room: roomName,
        });

        // Encode current awareness state
        const awarenessState = awarenessProtocol.encodeAwarenessUpdate(
            awareness,
            Array.from(awareness.getStates().keys())
        );

        return {
            state: documentManager.getDocumentState(documentId),
            awareness: awarenessState
        };
    }

    handleDocumentLeave(socket: AuthenticatedSocket, documentId: string): void {
        const roomName = getRoomName(documentId);
        socket.leave(roomName);

        const awareness = this.awarenessStates.get(documentId);
        if (awareness && socket.user) {
            awareness.setLocalState(null);
        }

        logger.info('User left document', {
            userId: socket.user?.userId,
            documentId,
            room: roomName,
        });
    }

    handleSyncUpdate(
        socket: AuthenticatedSocket,
        documentId: string,
        update: Uint8Array
    ): void {
        try {
            if (!socket.user) return;

            // Enforce Write Permissions
            const metadata = documentManager.getDocumentMetadata(documentId);
            if (!metadata) return;

            if (!permissionService.canEdit(socket.user.userId, metadata)) {
                logger.warn('Blocked unauthorized write attempt', {
                    userId: socket.user.userId,
                    documentId
                });
                return; // Silently ignore or emit error
            }

            documentManager.applyUpdate(documentId, update);

            const roomName = getRoomName(documentId);
            socket.to(roomName).emit('sync:update', update);

            logger.debug('Sync update applied and broadcasted', {
                userId: socket.user?.userId,
                documentId,
                updateSize: update.length,
            });
        } catch (error) {
            logger.error('Error handling sync update', {
                error: (error as Error).message,
                documentId,
            });
            throw error;
        }
    }

    handleAwarenessUpdate(
        socket: AuthenticatedSocket,
        documentId: string,
        update: Uint8Array
    ): void {
        try {
            const awareness = this.awarenessStates.get(documentId);
            if (!awareness) {
                throw new Error('Awareness state not found');
            }

            awarenessProtocol.applyAwarenessUpdate(awareness, update, null);

            const roomName = getRoomName(documentId);
            socket.to(roomName).emit('awareness:update', update);

            logger.debug('Awareness update applied and broadcasted', {
                userId: socket.user?.userId,
                documentId,
                updateSize: update.length,
            });
        } catch (error) {
            logger.error('Error handling awareness update', {
                error: (error as Error).message,
                documentId,
            });
            throw error;
        }
    }

    getAwareness(documentId: string): awarenessProtocol.Awareness | undefined {
        return this.awarenessStates.get(documentId);
    }

    cleanup(documentId: string): void {
        const awareness = this.awarenessStates.get(documentId);
        if (awareness) {
            awareness.destroy();
            this.awarenessStates.delete(documentId);
        }
    }
}

export const syncHandler = new SyncHandler();
