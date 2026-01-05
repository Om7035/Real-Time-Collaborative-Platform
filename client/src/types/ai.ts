export enum AIOperationType {
    TEXT_GENERATION = 'text-generation',
    TEXT_TO_IMAGE = 'text-to-image',
    SUMMARIZATION = 'summarization',
    CODE_COMPLETION = 'code-completion',
}

export interface AIPrompt {
    prompt: string;
    type: AIOperationType;
    documentId: string;
    userId: string;
    insertPosition?: number;
}

export interface AIResult {
    id: string;
    prompt: string;
    result: string;
    type: AIOperationType;
    timestamp: number;
}
