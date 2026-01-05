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
    userId: string;
}

export interface AIGenerationProgress {
    requestId: string;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message?: string;
}

export interface HuggingFaceResponse {
    generated_text?: string;
    error?: string;
}
