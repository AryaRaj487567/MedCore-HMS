import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@medcore/types';

export interface IAuditLogDocument extends Document {
  hospitalId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  changes?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, enum: Object.values(UserRole), required: true },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW'],
      required: true,
    },
    resource: { type: String, required: true },
    resourceId: String,
    ipAddress: String,
    changes: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ hospitalId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
