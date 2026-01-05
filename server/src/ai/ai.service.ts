import { AIPrompt, AIResult, AIOperationType } from '../types/ai.types';
import { huggingFaceClient } from './huggingface.client';
import { PromptValidator } from './prompt.validator';
import { cacheService } from './cache.service';
import { generateRequestId } from '../utils/helpers';
import logger from '../utils/logger';
import crypto from 'crypto';

export class AIService {
    private rateLimitMap: Map<string, number[]> = new Map();
    private readonly rateLimitPerMinute: number = 10;

    async generate(prompt: AIPrompt): Promise<AIResult> {
        if (!huggingFaceClient.isConfigured()) {
            throw new Error('HuggingFace API is not configured. Please set HUGGINGFACE_API_KEY.');
        }

        this.checkRateLimit(prompt.userId);

        const validation = PromptValidator.validate(prompt.prompt, prompt.type);
        if (!validation.valid) {
            throw new Error(`Invalid prompt: ${validation.errors.join(', ')}`);
        }

        const sanitizedPrompt = PromptValidator.sanitize(prompt.prompt);
        const cacheKey = this.getCacheKey(sanitizedPrompt, prompt.type);

        const cachedResult = cacheService.get(cacheKey);
        if (cachedResult) {
            logger.info('AI result served from cache', { userId: prompt.userId, type: prompt.type });
            return {
                id: generateRequestId(),
                prompt: sanitizedPrompt,
                result: cachedResult,
                type: prompt.type,
                timestamp: Date.now(),
                userId: prompt.userId,
            };
        }

        logger.info('Generating AI content', {
            userId: prompt.userId,
            type: prompt.type,
            promptLength: sanitizedPrompt.length,
        });

        try {
            const result = await huggingFaceClient.generateText(sanitizedPrompt, prompt.type);

            cacheService.set(cacheKey, result);

            this.recordRequest(prompt.userId);

            return {
                id: generateRequestId(),
                prompt: sanitizedPrompt,
                result,
                type: prompt.type,
                timestamp: Date.now(),
                userId: prompt.userId,
            };
        } catch (error) {
            logger.error('AI generation failed', {
                userId: prompt.userId,
                type: prompt.type,
                error: (error as Error).message,
            });
            throw error;
        }
    }

    private checkRateLimit(userId: string): void {
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(userId) || [];

        const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);

        if (recentRequests.length >= this.rateLimitPerMinute) {
            throw new Error('Rate limit exceeded. Please try again in a minute.');
        }
    }

    private recordRequest(userId: string): void {
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(userId) || [];

        userRequests.push(now);

        const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);
        this.rateLimitMap.set(userId, recentRequests);
    }

    private getCacheKey(prompt: string, type: AIOperationType): string {
        const hash = crypto.createHash('sha256');
        hash.update(`${type}:${prompt}`);
        return hash.digest('hex');
    }

    getRateLimitStatus(userId: string): { remaining: number; resetIn: number } {
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(userId) || [];
        const recentRequests = userRequests.filter(timestamp => now - timestamp < 60000);

        const remaining = Math.max(0, this.rateLimitPerMinute - recentRequests.length);
        const oldestRequest = recentRequests[0];
        const resetIn = oldestRequest ? 60000 - (now - oldestRequest) : 0;

        return { remaining, resetIn };
    }
}

export const aiService = new AIService();
