export interface User {
    id: string;
    email: string;
    passwordHash: string;
    role: 'user' | 'admin';
    createdAt: number;
}

export interface JWTPayload {
    userId: string;
    email: string;
    role: 'user' | 'admin';
    iat: number;
    exp: number;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}
