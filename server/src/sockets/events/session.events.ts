import { AuthenticatedSocket } from '../../types/socket.types';
import { sessionManager } from '../../session/session.manager';
import logger from '../../utils/logger';
import * as Y from 'yjs';

export const setupSessionEvents = (socket: AuthenticatedSocket) => {

    socket.on('session:join', (sessionId: string, callback: (response: any) => void) => {
        try {
            const session = sessionManager.getSession(sessionId);
            if (!session) {
                return callback({ success: false, error: 'Session not found. Please refresh.' });
            }

            // Join socket room
            socket.join(sessionId);
            sessionManager.joinSocket(sessionId, socket.id);

            // Send initial state (Vector)
            // Ideally we send the full document here or a diff if client sent their vector.
            // For simplicity in this contract, we send the full state.
            const state = Y.encodeStateAsUpdate(session.ydoc);

            logger.info(`User ${socket.user?.userId} joined session ${sessionId}`);

            callback({
                success: true,
                state: state
            });
        } catch (error) {
            logger.error('Failed to join session:', error);
            callback({ success: false, error: 'Internal server error' });
        }
    });

    socket.on('session:leave', (sessionId: string) => {
        socket.leave(sessionId);
        sessionManager.leaveSocket(sessionId, socket.id);
        logger.info(`User ${socket.user?.userId} left session ${sessionId}`);
    });

    socket.on('session:update', (sessionId: string, update: Uint8Array) => {
        const session = sessionManager.getSession(sessionId);
        if (session) {
            try {
                // Apply update to authoritative doc
                Y.applyUpdate(session.ydoc, new Uint8Array(update));
                session.lastActivity = Date.now();

                // Broadcast to others in session
                socket.to(sessionId).emit('session:update', update);
            } catch (err) {
                logger.error(`Failed to apply update for session ${sessionId}`, err);
            }
        }
    });
};
