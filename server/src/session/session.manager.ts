import { DocumentModel } from '../db/models/document.model';
import * as Y from 'yjs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface DocumentSession {
    sessionId: string;
    documentId: string;
    ydoc: Y.Doc;
    activeSockets: Set<string>;
    lastActivity: number;
}

class SessionManager {
    // Map<documentId, DocumentSession>
    private sessions: Map<string, DocumentSession> = new Map();
    // Map<sessionId, DocumentSession>
    private sessionById: Map<string, DocumentSession> = new Map();

    /**
     * Gets or creates a session for a document.
     * This is the ENTRY POINT for opening a document.
     */
    public async openSession(documentId: string): Promise<DocumentSession> {
        // 1. Check if session already active
        if (this.sessions.has(documentId)) {
            logger.info(`[SessionManager] Returning existing session for doc ${documentId}`);
            return this.sessions.get(documentId)!;
        }

        logger.info(`[SessionManager] Creating NEW session for doc ${documentId}`);

        // 2. Load data from DB
        const doc = await DocumentModel.findById(documentId);
        if (!doc) {
            throw new Error('Document not found');
        }

        // 3. Initialize Y.Doc
        const ydoc = new Y.Doc();
        if (doc.content) {
            try {
                // Ensure content is Uint8Array
                const contentBinary = doc.content instanceof Buffer
                    ? new Uint8Array(doc.content)
                    : new Uint8Array(doc.content as any);

                if (contentBinary.byteLength > 0) {
                    Y.applyUpdate(ydoc, contentBinary);
                }
            } catch (error) {
                logger.error(`[SessionManager] Failed to apply initial update for ${documentId}`, error);
                // We continue with empty doc rather than crashing, but this is critical
            }
        } else {
            // Initialize with default content if new? 
            // Ideally we just have an empty doc.
            ydoc.getText('content').insert(0, '');
        }

        // 4. Create Session Object
        const session: DocumentSession = {
            sessionId: uuidv4(),
            documentId: documentId,
            ydoc: ydoc,
            activeSockets: new Set(),
            lastActivity: Date.now()
        };

        // 5. Index
        this.sessions.set(documentId, session);
        this.sessionById.set(session.sessionId, session);

        // 6. Setup cleanup hooks (simple timeout for now/no-op)
        // In a real app we'd have an inactivity cleanup

        return session;
    }

    public getSession(sessionId: string): DocumentSession | undefined {
        return this.sessionById.get(sessionId);
    }

    public getSessionByDocId(docId: string): DocumentSession | undefined {
        return this.sessions.get(docId);
    }

    public joinSocket(sessionId: string, socketId: string) {
        const session = this.getSession(sessionId);
        if (session) {
            session.activeSockets.add(socketId);
            session.lastActivity = Date.now();
        }
    }

    public leaveSocket(sessionId: string, socketId: string) {
        const session = this.getSession(sessionId);
        if (session) {
            session.activeSockets.delete(socketId);
            if (session.activeSockets.size === 0) {
                // Schedule cleanup?
                // For now, simpler: Persist and keep in memory for a bit
                this.persistSession(session.documentId);
            }
        }
    }

    public async persistSession(documentId: string) {
        const session = this.sessions.get(documentId);
        if (!session) return;

        try {
            const state = Y.encodeStateAsUpdate(session.ydoc);
            // Convert Uint8Array to Buffer for Mongoose
            const buffer = Buffer.from(state);

            await DocumentModel.findByIdAndUpdate(documentId, {
                content: buffer,
                updatedAt: new Date()
            });
            logger.info(`[SessionManager] Persisted doc ${documentId}`);
        } catch (err) {
            logger.error(`[SessionManager] Failed to persist doc ${documentId}`, err);
        }
    }
}

export const sessionManager = new SessionManager();
