import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { SocketGateway } from './sockets/socket.gateway';
import { persistenceService } from './crdt/persistence.service';
import config from './utils/config';
import logger from './utils/logger';

async function startServer() {
    try {
        logger.info('Starting server initialization...');

        // 0. Connect to Database
        await mongoose.connect(config.mongoUri);
        logger.info('Connected to MongoDB');

        // 1. Initialize Auth Store (Migration check etc if needed)
        // await authService.initialize(); // DB doesn't need explicit init usually

        // 2. Initialize Persistence Layer (Documents)
        // In DB mode, we don't need to load ALL documents into memory at once
        // We can load them lazily or just ensure indices.
        // await persistenceService.loadAllDocuments(); 

        // 3. Start Auto-Save (Write-back cache)
        persistenceService.startAutoSave(10000); // More frequent saves for DB

        const app = createApp();
        const httpServer = http.createServer(app);
        const socketGateway = new SocketGateway(httpServer);

        // 4. Start Server
        httpServer.listen(config.port, config.host, () => {
            logger.info('Server started', {
                port: config.port,
                host: config.host,
                env: config.nodeEnv,
            });
        });

        // 5. Graceful Shutdown
        const gracefulShutdown = async (): Promise<void> => {
            logger.info('Graceful shutdown initiated');

            try {
                persistenceService.stopAutoSave();
                await persistenceService.saveAllDocuments();

                await socketGateway.close();

                httpServer.close(() => {
                    logger.info('HTTP server closed');
                    process.exit(0);
                });

                setTimeout(() => {
                    logger.error('Forced shutdown after timeout');
                    process.exit(1);
                }, 30000);
            } catch (error) {
                logger.error('Error during shutdown', { error: (error as Error).message });
                process.exit(1);
            }
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);
        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught exception', { error: error.message, stack: error.stack });
            gracefulShutdown();
        });
        process.on('unhandledRejection', (reason: unknown) => {
            logger.error('Unhandled rejection', { reason });
            gracefulShutdown();
        });

    } catch (error) {
        logger.error('Failed to start server:', error);

        // Helpful error messages for common startup issues
        if ((error as any).code === 'ENOTFOUND' && (error as any).syscall === 'querySrv') {
            logger.error('CRITICAL: MongoDB connection failed. Invalid Hostname.');
            logger.error('Please check your MONGO_URI in .env file.');
        } else if ((error as any).name === 'MongooseServerSelectionError') {
            logger.error('CRITICAL: Could not connect to MongoDB server.');
            logger.error(`Please ensure MongoDB is running at ${config.mongoUri}`);
        }

        process.exit(1);
    }
}

startServer();


