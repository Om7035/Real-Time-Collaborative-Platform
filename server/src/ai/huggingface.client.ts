import axios, { AxiosInstance } from 'axios';
import { AIOperationType, HuggingFaceResponse } from '../types/ai.types';
import config from '../utils/config';
import logger from '../utils/logger';

interface ModelConfig {
    [key: string]: string;
}

const MODEL_MAPPING: ModelConfig = {
    [AIOperationType.TEXT_GENERATION]: 'mistralai/Mistral-7B-Instruct-v0.2',
    [AIOperationType.SUMMARIZATION]: 'facebook/bart-large-cnn',
    [AIOperationType.CODE_COMPLETION]: 'bigcode/starcoder',
    [AIOperationType.TEXT_TO_IMAGE]: 'stabilityai/stable-diffusion-xl-base-1.0',
};

export class HuggingFaceClient {
    private client: AxiosInstance;
    private apiKey: string;

    constructor() {
        this.apiKey = config.ai.huggingfaceApiKey;

        this.client = axios.create({
            baseURL: 'https://api-inference.huggingface.co/models',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 60000,
        });
    }

    async generateText(prompt: string, type: AIOperationType): Promise<string> {
        try {
            const model = MODEL_MAPPING[type] || MODEL_MAPPING[AIOperationType.TEXT_GENERATION];

            logger.info('Calling HuggingFace API', { model, type });

            const response = await this.client.post<HuggingFaceResponse[]>(`/${model}`, {
                inputs: prompt,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    top_p: 0.95,
                    do_sample: true,
                },
            });

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                const result = response.data[0];
                if (result.generated_text) {
                    return result.generated_text;
                }
                if (result.error) {
                    throw new Error(result.error);
                }
            }

            throw new Error('Invalid response from HuggingFace API');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('HuggingFace API error', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                });

                if (error.response?.status === 503) {
                    throw new Error('Model is currently loading. Please try again in a moment.');
                }

                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }

                throw new Error(`HuggingFace API error: ${error.message}`);
            }

            throw error;
        }
    }

    async checkModelStatus(type: AIOperationType): Promise<boolean> {
        try {
            const model = MODEL_MAPPING[type];
            const response = await this.client.get(`/${model}`);
            return response.status === 200;
        } catch {
            return false;
        }
    }

    isConfigured(): boolean {
        return this.apiKey !== '' && this.apiKey !== 'your-huggingface-api-key';
    }
}

export const huggingFaceClient = new HuggingFaceClient();
