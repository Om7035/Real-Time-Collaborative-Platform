import express, { Application } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import documentRoutes from './routes/document.routes';
import healthRoutes from './routes/health.routes';
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import config from './utils/config';
import logger from './utils/logger';

import inviteRoutes from './routes/invite.routes';

export const createApp = (): Application => {
    const app = express();

    // Trust the first proxy (required for Railway/Heroku/Netlify)
    // Fixes: ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
    app.set('trust proxy', 1);

    app.use(cors({
        origin: (origin, callback) => {
            const allowed = config.cors.origin.split(',').map(o => o.trim());

            // In development, be more permissive to avoid common local networking issues
            const isLocalhost = origin && (
                origin.startsWith('http://localhost') ||
                origin.startsWith('http://127.0.0.1') ||
                origin.startsWith('http://[::1]')
            );

            if (!origin || allowed.includes(origin) || allowed.includes('*') || (config.nodeEnv === 'development' && isLocalhost)) {
                callback(null, true);
            } else {
                logger.warn('CORS blocked origin', { origin, allowed });
                callback(null, false);
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use(rateLimitMiddleware);

    app.use('/health', healthRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/documents', documentRoutes);
    app.use('/api/invites', inviteRoutes);

    app.use(errorMiddleware);

    logger.info('Express app configured');

    return app;
};
