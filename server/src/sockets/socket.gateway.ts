import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { ClientToServerEvents, ServerToClientEvents, AuthenticatedSocket } from '../types/socket.types';
import { authMiddleware } from './auth.middleware';
import { setupDocumentEvents } from './events/document.events';
import { setupSyncEvents } from './events/sync.events';
import { setupAIEvents } from './events/ai.events';
import { setupSessionEvents } from './events/session.events';
import config from '../utils/config';
import logger from '../utils/logger';

export class SocketGateway {
    private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

    constructor(httpServer: HTTPServer) {
        this.io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
            cors: {
                origin: (origin, callback) => {
                    const allowed = config.cors.origin.split(',').map(o => o.trim());
                    const isLocalhost = origin && (
                        origin.startsWith('http://localhost') ||
                        origin.startsWith('http://127.0.0.1') ||
                        origin.startsWith('http://[::1]')
                    );
                    if (!origin || allowed.includes(origin) || allowed.includes('*') || (config.nodeEnv === 'development' && isLocalhost)) {
                        callback(null, true);
                    } else {
                        callback(new Error('Not allowed by CORS'));
                    }
                },
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        this.setupMiddleware();
        this.setupConnectionHandler();

        logger.info('Socket.io gateway initialized');
    }

    private setupMiddleware(): void {
        this.io.use(authMiddleware);
    }

    private setupConnectionHandler(): void {
        this.io.on('connection', (socket: AuthenticatedSocket) => {
            logger.info('Client connected', {
                socketId: socket.id,
                userId: socket.user?.userId,
            });

            setupDocumentEvents(socket);
            setupSyncEvents(socket);
            setupAIEvents(socket);
            setupSessionEvents(socket);

            socket.on('disconnect', (reason) => {
                logger.info('Client disconnected', {
                    socketId: socket.id,
                    userId: socket.user?.userId,
                    reason,
                });
            });

            socket.on('error', (error) => {
                logger.error('Socket error', {
                    socketId: socket.id,
                    userId: socket.user?.userId,
                    error: error.message,
                });
            });
        });
    }

    getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
        return this.io;
    }

    async close(): Promise<void> {
        return new Promise((resolve) => {
            this.io.close(() => {
                logger.info('Socket.io gateway closed');
                resolve();
            });
        });
    }
}
