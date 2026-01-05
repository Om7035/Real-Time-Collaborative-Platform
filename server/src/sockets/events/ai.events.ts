import * as Y from 'yjs';
import { AuthenticatedSocket, AIResponse } from '../../types/socket.types';
import { AIPrompt } from '../../types/ai.types';
import { aiService } from '../../ai/ai.service';
import { documentManager } from '../../crdt/document.manager';
import { getRoomName } from '../../utils/helpers';
import logger from '../../utils/logger';

export const setupAIEvents = (socket: AuthenticatedSocket): void => {
    socket.on('ai:generate', async (prompt: AIPrompt, callback: (response: AIResponse) => void) => {
        try {
            if (!socket.user) {
                callback({ success: false, error: 'Not authenticated' });
                return;
            }

            prompt.userId = socket.user.userId;

            const ydoc = documentManager.getDocument(prompt.documentId);
            if (!ydoc) {
                callback({ success: false, error: 'Document not found' });
                return;
            }

            logger.info('AI generation requested', {
                userId: socket.user.userId,
                documentId: prompt.documentId,
                type: prompt.type,
            });

            socket.emit('ai:progress', 0);

            const result = await aiService.generate(prompt);

            socket.emit('ai:progress', 50);

            ydoc.transact(() => {
                const yContent = ydoc.getText('content');
                const yAIGenerations = ydoc.getArray('aiGenerations');

                const insertPosition = prompt.insertPosition ?? yContent.length;
                yContent.insert(insertPosition, `\n\n${result.result}\n\n`);

                yAIGenerations.push([{
                    id: result.id,
                    prompt: result.prompt,
                    result: result.result,
                    timestamp: result.timestamp,
                    insertedAt: insertPosition,
                }]);
            });

            socket.emit('ai:progress', 100);
            socket.emit('ai:result', result.result);

            const roomName = getRoomName(prompt.documentId);
            const update = Y.encodeStateAsUpdate(ydoc);
            socket.to(roomName).emit('sync:update', update);

            callback({ success: true, requestId: result.id });

            logger.info('AI generation completed', {
                userId: socket.user.userId,
                documentId: prompt.documentId,
                requestId: result.id,
            });
        } catch (error) {
            logger.error('AI generation failed', {
                userId: socket.user?.userId,
                documentId: prompt.documentId,
                error: (error as Error).message,
            });

            socket.emit('ai:error', (error as Error).message);
            callback({ success: false, error: (error as Error).message });
        }
    });
};
