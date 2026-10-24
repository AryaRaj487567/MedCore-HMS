import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    token: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId ? String : String, required: true, default: 'default' },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

RefreshTokenSchema.index({ userId: 1, deviceId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL index to auto-clean expired tokens

export const RefreshTokenModel = mongoose.model<IRefreshTokenDocument>('RefreshToken', RefreshTokenSchema);
