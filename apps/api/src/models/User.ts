import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@medcore/types';

export interface IUserDocument extends Document {
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  hospitalId?: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      index: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: 'Hospital',
      index: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    isEmailVerified: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ hospitalId: 1, role: 1 });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
