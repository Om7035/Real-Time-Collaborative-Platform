import React, { useState } from 'react';
import { AIOperationType } from '../types/ai';
import { Socket, AIPrompt } from '../socket/socket.client';
import './AIPanel.css';

interface AIPanelProps {
    socket: Socket | null;
    documentId: string;
    userId: string;
}

export const AIPanel: React.FC<AIPanelProps> = ({ socket, documentId, userId }) => {
    const [prompt, setPrompt] = useState('');
    const [type, setType] = useState<AIOperationType>(AIOperationType.TEXT_GENERATION);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const handleGenerate = () => {
        if (!socket || !prompt.trim()) return;

        setIsGenerating(true);
        setError(null);
        setResult(null);
        setProgress(0);

        const aiPrompt: AIPrompt = {
            prompt: prompt.trim(),
            type,
            documentId,
            userId,
        };

        socket.emit('ai:generate', aiPrompt, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
                setError(response.error || 'Generation failed');
                setIsGenerating(false);
            }
        });

        const progressHandler = (prog: number) => setProgress(prog);
        const resultHandler = (res: string) => {
            setResult(res);
            setIsGenerating(false);
            setProgress(100);
        };
        const errorHandler = (err: string) => {
            setError(err);
            setIsGenerating(false);
        };

        socket.on('ai:progress', progressHandler);
        socket.on('ai:result', resultHandler);
        socket.on('ai:error', errorHandler);

        return () => {
            socket.off('ai:progress', progressHandler);
            socket.off('ai:result', resultHandler);
            socket.off('ai:error', errorHandler);
        };
    };

    return (
        <div className="ai-panel">
            <h3>AI Assistant</h3>

            <div className="ai-type-selector">
                <label>Operation Type:</label>
                <select value={type} onChange={(e) => setType(e.target.value as AIOperationType)}>
                    <option value={AIOperationType.TEXT_GENERATION}>Text Generation</option>
                    <option value={AIOperationType.SUMMARIZATION}>Summarization</option>
                    <option value={AIOperationType.CODE_COMPLETION}>Code Completion</option>
                </select>
            </div>

            <div className="ai-prompt-input">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt..."
                    rows={4}
                    disabled={isGenerating}
                />
            </div>

            <button
                className="ai-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
            >
                {isGenerating ? 'Generating...' : 'Generate'}
            </button>

            {isGenerating && (
                <div className="ai-progress">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span>{progress}%</span>
                </div>
            )}

            {error && (
                <div className="ai-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {result && (
                <div className="ai-result">
                    <strong>Result:</strong>
                    <p>{result}</p>
                </div>
            )}
        </div>
    );
};
