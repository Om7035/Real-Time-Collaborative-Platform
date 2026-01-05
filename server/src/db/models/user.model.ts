import mongoose, { Schema, Document } from 'mongoose';
import { User } from '../../types/auth.types';

export interface IUserDocument extends Document, Omit<User, 'id'> {
    _id: mongoose.Types.ObjectId;
}

const UserSchema: Schema = new Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: 'user' },
    createdAt: { type: Number, default: () => Date.now() },
}, {
    versionKey: false,
    timestamps: false
});

// Transform _id to id when returning JSON
UserSchema.set('toJSON', {
    virtuals: true, // ensure id is included
    transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash; // security
        return ret;
    }
});

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
