import { useState, useCallback, useEffect } from 'react';
import axios from '../auth/axiosInstance';
import config from '../utils/config';

interface SessionData {
    sessionId: string;
    documentId: string;
    role: string;
}

export type SessionStatus = 'idle' | 'requesting' | 'ready' | 'error';

export const useDocumentSession = (documentId: string | undefined) => {
    const [session, setSession] = useState<SessionData | null>(null);
    const [status, setStatus] = useState<SessionStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const requestSession = useCallback(async () => {
        if (!documentId) return;

        setStatus('requesting');
        setError(null);

        try {
            // Using the new endpoints
            const response = await axios.post(config.endpoints.documents.session(documentId));

            if (response.data.success) {
                setSession(response.data.data);
                setStatus('ready');
            } else {
                throw new Error(response.data.error || 'Failed to start session');
            }
        } catch (err: any) {
            console.error('Session request failed:', err);
            setError(err.response?.data?.error || err.message || 'Failed to connect to document server');
            setStatus('error');
        }
    }, [documentId]);

    // Cleanup on unmount/id change
    useEffect(() => {
        setSession(null);
        setStatus('idle');
        setError(null);
    }, [documentId]);

    return {
        session,
        status,
        error,
        requestSession
    };
};
