import mongoose, { Schema, Document } from 'mongoose';
import { NotificationType } from '@medcore/types';

export interface INotificationDocument extends Document {
  hospitalId?: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      default: NotificationType.SYSTEM,
    },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipientUserId: 1, read: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
