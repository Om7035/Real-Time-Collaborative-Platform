import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => {
    return uuidv4();
};

export const generateDocumentId = (): string => {
    return `doc_${uuidv4()}`;
};

export const generateUserId = (): string => {
    return `user_${uuidv4()}`;
};

export const generateRequestId = (): string => {
    return `req_${uuidv4()}`;
};

export const getRoomName = (documentId: string): string => {
    return `document:${documentId}`;
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const sanitizeString = (str: string): string => {
    return str.trim().replace(/[<>]/g, '');
};
