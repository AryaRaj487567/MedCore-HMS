import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { NotificationModel } from '../../models';

const router = Router();

// GET /notifications/me — fetch notifications for the authenticated user
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const notifications = await NotificationModel.find({
      recipientUserId: req.user!.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return sendSuccess(res, notifications);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /notifications/:id/read — mark notification as read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: req.user!.userId },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return sendError(res, 'NOT_FOUND', 'Notification not found', 404);
    }
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /notifications/read-all — mark all as read
router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    await NotificationModel.updateMany(
      { recipientUserId: req.user!.userId, read: false },
      { read: true }
    );
    return sendSuccess(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
