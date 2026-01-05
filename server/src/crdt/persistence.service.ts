import { documentManager } from './document.manager';
import logger from '../utils/logger';
import { DocumentModel } from '../db/models/document.model';

export class PersistenceService {
    private saveInterval: NodeJS.Timeout | null = null;

    async saveDocument(documentId: string): Promise<void> {
        try {
            const state = documentManager.getDocumentState(documentId);
            const metadata = documentManager.getDocumentMetadata(documentId);

            if (!metadata) {
                // If metadata is missing in memory, maybe it was deleted?
                return;
            }

            // Upsert document
            await DocumentModel.findOneAndUpdate(
                { _id: documentId }, // Assuming documentId is the Mongo ID
                {
                    title: metadata.title,
                    ownerId: metadata.ownerId,
                    collaborators: metadata.collaborators, // Save full object list
                    updatedAt: metadata.lastModified,
                    content: Buffer.from(state)
                },
                { upsert: true, new: true }
            );

            logger.debug('Document saved to DB', { documentId });
        } catch (error) {
            logger.error('Failed to save document', {
                documentId,
                error: (error as Error).message,
            });
            // Don't throw to prevent crashing auto-save loop
        }
    }

    async loadDocument(documentId: string): Promise<boolean> {
        try {
            const doc = await DocumentModel.findById(documentId);
            if (!doc) return false;

            if (doc.content) {
                const metadata = {
                    id: doc.id,
                    title: doc.title,
                    ownerId: doc.ownerId,
                    collaborators: doc.collaborators, // Restore collaborators
                    createdAt: doc.createdAt,
                    lastModified: doc.updatedAt,
                };

                // We cast Buffer to Uint8Array for Y.js
                documentManager.restoreDocument(metadata as any, new Uint8Array(doc.content));
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to load document', {
                documentId,
                error: (error as Error).message,
            });
            throw error;
        }
    }

    async loadAllDocuments(): Promise<void> {
        try {
            const docs = await DocumentModel.find({});
            logger.info(`Found ${docs.length} documents in DB to restore.`);

            for (const doc of docs) {
                try {
                    if (doc.content) {
                        const metadata = {
                            id: doc.id,
                            title: doc.title,
                            ownerId: doc.ownerId,
                            collaborators: doc.collaborators, // Restore collaborators
                            createdAt: doc.createdAt,
                            lastModified: doc.updatedAt,
                        };
                        documentManager.restoreDocument(metadata as any, new Uint8Array(doc.content));
                    }
                } catch (err) {
                    logger.error(`Failed to restore document ${doc.id}`, err);
                }
            }
        } catch (error) {
            logger.error('Failed to load all documents', error);
            throw error;
        }
    }

    async deleteDocument(documentId: string): Promise<void> {
        try {
            await DocumentModel.deleteOne({ _id: documentId });
            logger.info('Document deleted from DB', { documentId });
        } catch (error) {
            logger.error('Failed to delete document', {
                documentId,
                error: (error as Error).message,
            });
        }
    }

    startAutoSave(intervalMs: number = 60000): void {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
        }

        this.saveInterval = setInterval(async () => {
            const documents = documentManager.getAllDocuments();
            for (const doc of documents) {
                // We don't await sequentially to speeed up
                this.saveDocument(doc.id).catch(err => console.error(err));
            }
        }, intervalMs);

        logger.info('Auto-save started', { intervalMs });
    }

    stopAutoSave(): void {
        if (this.saveInterval) {
            clearInterval(this.saveInterval);
            this.saveInterval = null;
            logger.info('Auto-save stopped');
        }
    }

    async saveAllDocuments(): Promise<void> {
        const documents = documentManager.getAllDocuments();
        logger.info('Saving all documents', { count: documents.length });

        for (const doc of documents) {
            await this.saveDocument(doc.id);
        }
    }
}

export const persistenceService = new PersistenceService();
