import * as Y from 'yjs';
import { DocumentMetadata } from '../types/document.types';
import logger from '../utils/logger';

export class DocumentManager {
    private documents: Map<string, Y.Doc> = new Map();
    private metadata: Map<string, DocumentMetadata> = new Map();

    // Updated to accept ID from DB, rather than generating one internally
    createDocument(documentId: string, ownerId: string, title: string = 'Untitled Document'): DocumentMetadata {
        // ID must be provided from valid DB source
        return this.initializeDocument(documentId, ownerId, title, Date.now(), Date.now());
    }

    restoreDocument(metadata: DocumentMetadata, state: Uint8Array): void {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, state);

        this.documents.set(metadata.id, ydoc);
        this.metadata.set(metadata.id, metadata);

        logger.info('Document restored', { documentId: metadata.id });
    }

    private initializeDocument(documentId: string, ownerId: string, title: string, createdAt: number, lastModified: number): DocumentMetadata {
        const ydoc = new Y.Doc();
        // Initialize CRDT structures
        ydoc.getText('content');
        const yMetadata = ydoc.getMap('metadata');
        ydoc.getMap('cursors');
        ydoc.getArray('aiGenerations');

        const metadata: DocumentMetadata = {
            id: documentId,
            title,
            ownerId,
            collaborators: [], // Init empty
            createdAt,
            lastModified,
        };

        yMetadata.set('title', title);
        yMetadata.set('createdAt', metadata.createdAt);
        yMetadata.set('lastModified', metadata.lastModified);
        yMetadata.set('owner', ownerId);

        this.documents.set(documentId, ydoc);
        this.metadata.set(documentId, metadata);

        logger.info('Document created', { documentId, ownerId, title });

        return metadata;
    }

    getDocument(documentId: string): Y.Doc | undefined {
        return this.documents.get(documentId);
    }

    getDocumentMetadata(documentId: string): DocumentMetadata | undefined {
        return this.metadata.get(documentId);
    }

    addCollaborator(documentId: string, userId: string, email: string, role: any): void {
        const metadata = this.metadata.get(documentId);
        if (!metadata) throw new Error('Document not found');

        // Check availability
        const exists = metadata.collaborators.some(c => c.userId === userId);
        if (exists) {
            // Update role
            metadata.collaborators = metadata.collaborators.map(c =>
                c.userId === userId ? { ...c, role } : c
            );
        } else {
            metadata.collaborators.push({
                userId,
                email,
                role,
                addedAt: Date.now()
            });
        }
        this.metadata.set(documentId, metadata);
    }

    removeCollaborator(documentId: string, userId: string): void {
        const metadata = this.metadata.get(documentId);
        if (!metadata) throw new Error('Document not found');

        metadata.collaborators = metadata.collaborators.filter(c => c.userId !== userId);
        this.metadata.set(documentId, metadata);
    }

    getAllDocuments(): DocumentMetadata[] {
        return Array.from(this.metadata.values());
    }

    getDocumentsByOwner(ownerId: string): DocumentMetadata[] {
        return Array.from(this.metadata.values()).filter(
            (doc) => doc.ownerId === ownerId
        );
    }

    updateDocumentMetadata(documentId: string, updates: Partial<DocumentMetadata>): DocumentMetadata {
        const ydoc = this.documents.get(documentId);
        const metadata = this.metadata.get(documentId);

        if (!ydoc || !metadata) {
            throw new Error('Document not found');
        }

        const yMetadata = ydoc.getMap('metadata');

        if (updates.title !== undefined) {
            yMetadata.set('title', updates.title);
            metadata.title = updates.title;
        }

        metadata.lastModified = Date.now();
        yMetadata.set('lastModified', metadata.lastModified);

        logger.info('Document metadata updated', { documentId, updates });
        return metadata;
    }

    updateDocumentTitle(documentId: string, title: string): void {
        this.updateDocumentMetadata(documentId, { title });
    }

    deleteDocument(documentId: string): void {
        const ydoc = this.documents.get(documentId);
        if (ydoc) {
            ydoc.destroy();
        }

        this.documents.delete(documentId);
        this.metadata.delete(documentId);

        logger.info('Document deleted', { documentId });
    }

    getDocumentState(documentId: string): Uint8Array {
        const ydoc = this.documents.get(documentId);
        if (!ydoc) {
            throw new Error('Document not found');
        }

        return Y.encodeStateAsUpdate(ydoc);
    }

    applyUpdate(documentId: string, update: Uint8Array): void {
        const ydoc = this.documents.get(documentId);
        if (!ydoc) {
            throw new Error('Document not found');
        }

        Y.applyUpdate(ydoc, update);

        const metadata = this.metadata.get(documentId);
        if (metadata) {
            metadata.lastModified = Date.now();
        }
    }

    getActiveUsers(_documentId: string): number {
        return 0;
    }
}

export const documentManager = new DocumentManager();
