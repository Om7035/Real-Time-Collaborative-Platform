import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../types/document.types';

export interface IInviteDocument extends Document {
    token: string;
    documentId: string;
    role: UserRole;
    createdBy: string;
    createdAt: number;
    expiresAt: number | null;
    maxUses: number | null;
    usedCount: number;
    revoked: boolean;
}

const InviteSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true, index: true },
    documentId: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: Object.values(UserRole) },
    createdBy: { type: String, required: true },
    createdAt: { type: Number, default: () => Date.now() },
    expiresAt: { type: Number, default: null },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
}, {
    versionKey: false,
    timestamps: false
});

// Map _id to id or just use token as ID?
// existing Invite interface uses 'id' which is the token UUID.
// So we can keep mapped ID or just rely on 'token' field.
// Let's keep it simple and just use the schema as is.
InviteSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        ret.id = ret._id.toString(); // Mongo ID, but wait, Invite interface 'id' is the token?
        // In previous implementation: id = uuidv4().
        // If we want to keep API consistent, we should expose 'token' as 'id' or return both?
        // Let's look at Invite interface: id: string; // The token
        // So we should map 'token' to 'id' in JSON response?
        // Actually, let's just use 'id' field in schema to hold the token UUID if we want to mimic it perfectly,
        // or just use 'token' field and map it.
        ret.id = ret.token;
        delete ret._id;
        delete ret.token; // hide internal token field if mapped to id?
        return ret;
    }
});

export const InviteModel = mongoose.model<IInviteDocument>('Invite', InviteSchema);
