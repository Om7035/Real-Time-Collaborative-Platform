import { DocumentMetadata, UserRole } from '../types/document.types';

export class PermissionService {
    /**
     * Determines user's role on a valid document.
     * Returns null if user has no access.
     */
    getUserRole(userId: string, metadata: DocumentMetadata): UserRole | null {
        if (metadata.ownerId === userId) {
            return UserRole.OWNER;
        }

        // Defensive: ensure collaborators array exists (for backwards compatibility with old documents)
        if (!metadata.collaborators || !Array.isArray(metadata.collaborators)) {
            return null;
        }

        const collaborator = metadata.collaborators.find(c => c.userId === userId);
        if (collaborator) {
            return collaborator.role;
        }

        return null;
    }

    canView(userId: string, metadata: DocumentMetadata): boolean {
        const role = this.getUserRole(userId, metadata);
        return role !== null;
    }

    canEdit(userId: string, metadata: DocumentMetadata): boolean {
        const role = this.getUserRole(userId, metadata);
        return role === UserRole.OWNER || role === UserRole.EDITOR;
    }

    canManage(userId: string, metadata: DocumentMetadata): boolean {
        const role = this.getUserRole(userId, metadata);
        return role === UserRole.OWNER;
    }

    canDelete(userId: string, metadata: DocumentMetadata): boolean {
        return metadata.ownerId === userId;
    }
}

export const permissionService = new PermissionService();
