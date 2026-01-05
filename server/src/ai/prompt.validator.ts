import { AIOperationType } from '../types/ai.types';

export class PromptValidator {
    private static readonly MAX_PROMPT_LENGTH = 2000;
    private static readonly MIN_PROMPT_LENGTH = 3;

    static validate(prompt: string, type: AIOperationType): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!prompt || prompt.trim().length === 0) {
            errors.push('Prompt cannot be empty');
            return { valid: false, errors };
        }

        const trimmedPrompt = prompt.trim();

        if (trimmedPrompt.length < this.MIN_PROMPT_LENGTH) {
            errors.push(`Prompt must be at least ${this.MIN_PROMPT_LENGTH} characters`);
        }

        if (trimmedPrompt.length > this.MAX_PROMPT_LENGTH) {
            errors.push(`Prompt must not exceed ${this.MAX_PROMPT_LENGTH} characters`);
        }

        if (this.containsUnsafeContent(trimmedPrompt)) {
            errors.push('Prompt contains potentially unsafe content');
        }

        if (type === AIOperationType.CODE_COMPLETION) {
            if (!this.isValidCodePrompt(trimmedPrompt)) {
                errors.push('Invalid code completion prompt');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    private static containsUnsafeContent(prompt: string): boolean {
        const unsafePatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i,
        ];

        return unsafePatterns.some(pattern => pattern.test(prompt));
    }

    private static isValidCodePrompt(prompt: string): boolean {
        return prompt.length > 5;
    }

    static sanitize(prompt: string): string {
        return prompt
            .trim()
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .substring(0, this.MAX_PROMPT_LENGTH);
    }
}
