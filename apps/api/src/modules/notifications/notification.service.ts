import { Server as SocketIOServer } from 'socket.io';
import { NotificationModel, UserModel } from '../../models';
import { NotificationType } from '@medcore/types';
import mongoose from 'mongoose';

let ioInstance: SocketIOServer | null = null;

export function initSocketIO(io: SocketIOServer) {
  ioInstance = io;
  io.on('connection', (socket) => {
    socket.on('join_user_room', (userId: string) => {
      socket.join(`user:${userId}`);
    });
    socket.on('join_hospital_room', (hospitalId: string) => {
      socket.join(`hospital:${hospitalId}`);
    });
  });
}

export async function sendNotification({
  hospitalId,
  recipientUserId,
  title,
  message,
  type,
  metadata,
}: {
  hospitalId?: string | mongoose.Types.ObjectId;
  recipientUserId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}) {
  try {
    const notification = await NotificationModel.create({
      hospitalId: hospitalId ? new mongoose.Types.ObjectId(hospitalId.toString()) : undefined,
      recipientUserId: new mongoose.Types.ObjectId(recipientUserId.toString()),
      title,
      message,
      type,
      metadata,
      read: false,
    });

    // Real-time WebSocket emission
    if (ioInstance) {
      ioInstance.to(`user:${recipientUserId.toString()}`).emit('new_notification', {
        id: notification._id,
        title,
        message,
        type,
        createdAt: notification.createdAt,
      });

      if (hospitalId) {
        ioInstance.to(`hospital:${hospitalId.toString()}`).emit('hospital_event', {
          type,
          title,
          message,
        });
      }
    }

    // Simulated Fan-Out per PRD (Email + SMS channel simulator)
    console.log(`[Notification Bus][${type}] To User: ${recipientUserId} | Title: "${title}" | Message: "${message}"`);
    return notification;
  } catch (err) {
    console.error('[Notification Bus] Error dispatching notification:', err);
    return null;
  }
}
