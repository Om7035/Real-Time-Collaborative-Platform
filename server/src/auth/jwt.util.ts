import jwt from 'jsonwebtoken';
import { JWTPayload, AuthTokens } from '../types/auth.types';
import config from '../utils/config';

export class JWTUtil {
    static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
        // @ts-expect-error - jsonwebtoken types have issues with expiresIn option
        const token = jwt.sign(
            payload as object,
            String(config.jwt.secret),
            { expiresIn: config.jwt.accessExpiry }
        );
        return token;
    }

    static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
        // @ts-expect-error - jsonwebtoken types have issues with expiresIn option
        const token = jwt.sign(
            payload as object,
            String(config.jwt.refreshSecret),
            { expiresIn: config.jwt.refreshExpiry }
        );
        return token;
    }

    static generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): AuthTokens {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
        };
    }

    static verifyAccessToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, config.jwt.secret) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired access token');
        }
    }

    static verifyRefreshToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, config.jwt.refreshSecret) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    static decodeToken(token: string): JWTPayload | null {
        try {
            return jwt.decode(token) as JWTPayload;
        } catch {
            return null;
        }
    }
}
