import { Invite, UserRole } from '../types/document.types';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { InviteModel } from '../db/models/invite.model';

class InviteService {
    async createInvite(
        documentId: string,
        createdBy: string,
        role: UserRole = UserRole.VIEWER,
        expiresInSeconds: number | null = 86400 * 7, // 7 days default
        maxUses: number | null = null
    ): Promise<Invite> {
        const token = uuidv4();
        const now = Date.now();
        const expiresAt = expiresInSeconds ? now + (expiresInSeconds * 1000) : null;

        const newInvite = new InviteModel({
            token,
            documentId,
            role,
            createdBy,
            createdAt: now,
            expiresAt,
            maxUses,
            usedCount: 0,
            revoked: false
        });

        await newInvite.save();
        logger.info('Invite created', { documentId, role, inviteId: token });
        return newInvite.toJSON() as unknown as Invite;
    }

    async getInvite(token: string): Promise<Invite | null> {
        const doc = await InviteModel.findOne({ token });
        return doc ? (doc.toJSON() as unknown as Invite) : null;
    }

    async getDocumentInvites(documentId: string): Promise<Invite[]> {
        const docs = await InviteModel.find({ documentId, revoked: false });
        return docs.map(d => d.toJSON() as unknown as Invite);
    }

    async validateInvite(token: string): Promise<{ valid: boolean; error?: string; invite?: Invite }> {
        const invite = await this.getInvite(token);

        if (!invite) {
            return { valid: false, error: 'Invite not found' };
        }

        if (invite.revoked) {
            return { valid: false, error: 'Invite has been revoked' };
        }

        if (invite.expiresAt && Date.now() > invite.expiresAt) {
            return { valid: false, error: 'Invite has expired' };
        }

        if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
            return { valid: false, error: 'Invite usage limit reached' };
        }

        return { valid: true, invite };
    }

    async acceptInvite(token: string): Promise<Invite> {
        const { valid, invite, error } = await this.validateInvite(token);
        if (!valid || !invite) {
            throw new Error(error || 'Invalid invite');
        }

        // Atomic update
        const updatedDoc = await InviteModel.findOneAndUpdate(
            { token },
            { $inc: { usedCount: 1 } },
            { new: true }
        );

        if (!updatedDoc) throw new Error('Invite not found during acceptance');

        logger.info('Invite accepted', { inviteId: token, count: updatedDoc.usedCount });
        return updatedDoc.toJSON() as unknown as Invite;
    }

    async revokeInvite(token: string): Promise<void> {
        await InviteModel.updateOne({ token }, { revoked: true });
        logger.info('Invite revoked', { inviteId: token });
    }
}

export const inviteService = new InviteService();
