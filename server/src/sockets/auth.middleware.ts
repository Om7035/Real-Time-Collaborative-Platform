import { Socket } from 'socket.io';
import { JWTUtil } from '../auth/jwt.util';
import { AuthenticatedSocket } from '../types/socket.types';
import logger from '../utils/logger';

export const authMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            logger.warn('Socket connection attempt without token', {
                socketId: socket.id,
            });
            return next(new Error('Authentication token required'));
        }

        const payload = JWTUtil.verifyAccessToken(token);

        (socket as AuthenticatedSocket).user = payload;

        logger.info('Socket authenticated', {
            socketId: socket.id,
            userId: payload.userId,
        });

        next();
    } catch (error) {
        logger.error('Socket authentication failed', {
            socketId: socket.id,
            error: (error as Error).message,
        });
        next(new Error('Invalid authentication token'));
    }
};
