const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    // Fallback to the same hostname but port 3000
    const hostname = window.location.hostname || '127.0.0.1';
    return `http://${hostname}:3000`;
};

const getWsUrl = () => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;

    const hostname = window.location.hostname || '127.0.0.1';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${hostname}:3000`;
};

const API_URL = getBaseUrl();
const WS_URL = getWsUrl();

export const config = {
    apiUrl: API_URL,
    wsUrl: WS_URL,
    endpoints: {
        auth: {
            register: `${API_URL}/api/auth/register`,
            login: `${API_URL}/api/auth/login`,
            refresh: `${API_URL}/api/auth/refresh`,
            validate: `${API_URL}/api/auth/validate`,
        },
        documents: {
            create: `${API_URL}/api/documents/create`,
            list: `${API_URL}/api/documents`,
            get: (id: string) => `${API_URL}/api/documents/${id}`,
            update: (id: string) => `${API_URL}/api/documents/${id}`,
            delete: (id: string) => `${API_URL}/api/documents/${id}`,
            session: (id: string) => `${API_URL}/api/documents/${id}/session`,
        },
        invites: {
            create: (docId: string) => `${API_URL}/api/documents/${docId}/invites`,
            list: (docId: string) => `${API_URL}/api/documents/${docId}/invites`,
            get: (token: string) => `${API_URL}/api/invites/${token}`,
            accept: (token: string) => `${API_URL}/api/invites/${token}/accept`,
            revoke: (token: string) => `${API_URL}/api/invites/${token}`,
        },
    },
};

export default config;
