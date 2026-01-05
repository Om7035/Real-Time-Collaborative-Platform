export interface Document {
    id: string;
    title: string;
    ownerId: string;
    createdAt: number;
    lastModified: number;
    yDocState: Uint8Array;
}

export enum UserRole {
    OWNER = 'owner',
    EDITOR = 'editor',
    VIEWER = 'viewer'
}

export interface Collaborator {
    userId: string;
    email: string;
    role: UserRole;
    addedAt: number;
}

export interface DocumentMetadata {
    id: string;
    title: string;
    ownerId: string;
    collaborators: Collaborator[];
    createdAt: number;
    lastModified: number;
}

export interface YjsUpdate {
    documentId: string;
    update: Uint8Array;
    userId: string;
    timestamp: number;
}

export interface AwarenessUpdate {
    documentId: string;
    update: Uint8Array;
    userId: string;
}

export interface Invite {
    id: string;          // The token
    documentId: string;
    role: UserRole;
    createdBy: string;
    createdAt: number;
    expiresAt: number | null;
    maxUses: number | null;
    usedCount: number;
    revoked: boolean;
}
