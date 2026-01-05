import { Request, Response } from 'express';
import { authService } from './auth.service';
import { RegisterRequest, LoginRequest } from '../types/auth.types';
import logger from '../utils/logger';

export class AuthController {
    async register(req: Request, res: Response): Promise<void> {
        try {
            const request: RegisterRequest = req.body;

            if (!request.email || !request.password) {
                res.status(400).json({ success: false, error: 'Email and password are required' });
                return;
            }

            const tokens = await authService.register(request);
            const user = await authService.findUserByEmail(request.email);

            if (!user) {
                // This shouldn't happen after successful register
                res.status(500).json({ success: false, error: 'Failed to retrieve user after registration' });
                return;
            }

            res.status(201).json({
                success: true,
                data: {
                    tokens,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                },
            });
        } catch (error) {
            logger.error('Registration error', { error: (error as Error).message });
            res.status(400).json({
                success: false,
                error: (error as Error).message,
            });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        try {
            const request: LoginRequest = req.body;

            if (!request.email || !request.password) {
                res.status(400).json({ success: false, error: 'Email and password are required' });
                return;
            }

            const tokens = await authService.login(request);
            const user = await authService.findUserByEmail(request.email);

            if (!user) {
                res.status(404).json({ success: false, error: 'User not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: {
                    tokens,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                },
            });
        } catch (error) {
            logger.error('Login error', { error: (error as Error).message });
            res.status(401).json({
                success: false,
                error: (error as Error).message,
            });
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: 'Refresh token required',
                });
                return;
            }

            const tokens = await authService.refreshToken(refreshToken);

            res.status(200).json({
                success: true,
                data: tokens,
            });
        } catch (error) {
            logger.error('Token refresh error', { error: (error as Error).message });
            res.status(401).json({
                success: false,
                error: (error as Error).message,
            });
        }
    }

    async validate(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;

            if (!token) {
                res.status(400).json({
                    success: false,
                    error: 'Token required',
                });
                return;
            }

            const isValid = authService.validateAccessToken(token);

            res.status(200).json({
                success: true,
                data: { valid: isValid },
            });
        } catch (error) {
            logger.error('Token validation error', { error: (error as Error).message });
            res.status(400).json({
                success: false,
                error: (error as Error).message,
            });
        }
    }
}

export const authController = new AuthController();
