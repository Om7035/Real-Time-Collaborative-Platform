import { Socket } from 'socket.io';
import { JWTPayload } from './auth.types';
import { AIPrompt } from './ai.types';

export interface AuthenticatedSocket extends Socket {
    user?: JWTPayload;
}

export interface ClientToServerEvents {
    'auth:authenticate': (token: string, callback: (response: AuthResponse) => void) => void;
    'document:join': (documentId: string, callback: (response: JoinResponse) => void) => void;
    'document:leave': (documentId: string) => void;
    'sync:update': (update: Uint8Array) => void;
    'awareness:update': (update: Uint8Array) => void;
    'ai:generate': (prompt: AIPrompt, callback: (response: AIResponse) => void) => void;
}

export interface ServerToClientEvents {
    'auth:success': (userId: string) => void;
    'auth:error': (error: string) => void;
    'document:state': (state: Uint8Array) => void;
    'sync:update': (update: Uint8Array) => void;
    'awareness:update': (update: Uint8Array) => void;
    'ai:progress': (progress: number) => void;
    'ai:result': (result: string) => void;
    'ai:error': (error: string) => void;
    'error': (message: string) => void;
}

export interface AuthResponse {
    success: boolean;
    userId?: string;
    error?: string;
}

export interface JoinResponse {
    success: boolean;
    state?: Uint8Array;
    awareness?: Uint8Array;
    role?: string;
    error?: string;
}

export interface AIResponse {
    success: boolean;
    requestId?: string;
    error?: string;
}
