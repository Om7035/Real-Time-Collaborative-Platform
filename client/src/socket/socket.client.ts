import { io, Socket } from 'socket.io-client';
import config from '../utils/config';

interface ClientToServerEvents {
    'document:join': (documentId: string, callback: (response: JoinResponse) => void) => void;
    'document:leave': (documentId: string) => void;
    'sync:update': (update: Uint8Array) => void;
    'awareness:update': (update: Uint8Array) => void;
    'ai:generate': (prompt: AIPrompt, callback: (response: AIResponse) => void) => void;
}

interface ServerToClientEvents {
    'document:state': (state: Uint8Array) => void;
    'sync:update': (update: Uint8Array) => void;
    'awareness:update': (update: Uint8Array) => void;
    'ai:progress': (progress: number) => void;
    'ai:result': (result: string) => void;
    'ai:error': (error: string) => void;
    'error': (message: string) => void;
}

interface JoinResponse {
    success: boolean;
    state?: Uint8Array;
    error?: string;
}

interface AIResponse {
    success: boolean;
    requestId?: string;
    error?: string;
}

interface AIPrompt {
    prompt: string;
    type: string;
    documentId: string;
    userId: string;
    insertPosition?: number;
}

class SocketClient {
    private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

    connect(token: string): Socket<ServerToClientEvents, ClientToServerEvents> {
        // If socket exists but disconnected, try connecting
        if (this.socket) {
            if (this.socket.connected) return this.socket;
            this.socket.connect();
            return this.socket;
        }

        this.socket = io(config.wsUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        return this.socket;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
        return this.socket;
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

export const socketClient = new SocketClient();
export type { Socket, JoinResponse, AIResponse, AIPrompt };
