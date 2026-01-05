import { Request, Response, NextFunction } from 'express';
import { JWTUtil } from '../auth/jwt.util';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
    user: {
        userId: string;
        email: string;
        role: string;
    };
}

/**
 * Middleware to enforce authentication on HTTP routes.
 * Expects Authorization: Bearer <token>
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'Authentication failed: No token provided'
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const payload = JWTUtil.verifyAccessToken(token);

        // Attach payload to request
        (req as AuthenticatedRequest).user = payload;

        next();
    } catch (error) {
        logger.warn('Auth validation failed', {
            ip: req.ip,
            path: req.path,
            error: (error as Error).message
        });

        res.status(401).json({
            success: false,
            error: 'Authentication failed: Invalid or expired token'
        });
    }
};

/**
 * Optional authentication middleware.
 * Does not block the request if token is missing or invalid.
 */
export const optionalAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = JWTUtil.verifyAccessToken(token);
            (req as AuthenticatedRequest).user = payload;
        }
    } catch {
        // Silently skip if invalid
    }
    next();
};
