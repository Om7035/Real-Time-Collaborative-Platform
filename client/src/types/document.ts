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

export interface Invite {
    id: string;
    documentId: string;
    role: UserRole;
    createdBy: string;
    createdAt: number;
    expiresAt: number | null;
    maxUses: number | null;
    usedCount: number;
    revoked: boolean;
}

export interface CursorPosition {
    line: number;
    column: number;
}

export interface UserCursor {
    userId: string;
    userName: string;
    color: string;
    position: CursorPosition;
    selection?: {
        start: CursorPosition;
        end: CursorPosition;
    };
}
