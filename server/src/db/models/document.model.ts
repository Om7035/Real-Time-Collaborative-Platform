import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
    title: string;
    ownerId: string;
    collaborators: {
        userId: string;
        email?: string;
        role: string;
        addedAt: number;
    }[]; // List of Users with roles
    content: Buffer; // Binary Y.js update
    createdAt: number;
    updatedAt: number;
}

const DocumentSchema: Schema = new Schema({
    title: { type: String, required: true, default: 'Untitled Document' },
    ownerId: { type: String, required: true, index: true },
    collaborators: [{
        userId: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, required: true },
        addedAt: { type: Number, required: true }
    }],
    content: { type: Buffer, required: false }, // Can be empty initially
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
}, {
    versionKey: false,
    timestamps: false
});

// Transform _id to id
DocumentSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.content; // Don't send binary blob in metadata lists
        return ret;
    }
});

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
