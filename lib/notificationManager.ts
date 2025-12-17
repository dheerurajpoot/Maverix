import Notification from '@/models/Notification';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';

const MAX_NOTIFICATIONS_PER_USER = 10;

/**
 * Creates a notification and ensures the user only has MAX_NOTIFICATIONS_PER_USER notifications
 * by deleting the oldest one if the limit is exceeded
 */
export async function createNotification(data: {
  userId: string | mongoose.Types.ObjectId;
  type: 'leave_approved' | 'leave_rejected' | 'mention';
  title: string;
  message: string;
  leaveId?: string | mongoose.Types.ObjectId;
  feedId?: string | mongoose.Types.ObjectId;
  mentionedBy?: string | mongoose.Types.ObjectId;
}): Promise<any> {
  try {
    await connectDB();
    
    const userId = typeof data.userId === 'string' ? new mongoose.Types.ObjectId(data.userId) : data.userId;

    // Count existing notifications for this user
    const notificationCount = await Notification.countDocuments({ userId });

    // If user already has MAX_NOTIFICATIONS_PER_USER notifications, delete the oldest one
    if (notificationCount >= MAX_NOTIFICATIONS_PER_USER) {
      const oldestNotification = await Notification.findOne({ userId })
        .sort({ createdAt: 1 }) // Sort by oldest first
        .select('_id')
        .lean();

      if (oldestNotification) {
        await Notification.findByIdAndDelete(oldestNotification._id);
      }
    }

    // Create the new notification
    const notification = new Notification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      leaveId: data.leaveId ? (typeof data.leaveId === 'string' ? new mongoose.Types.ObjectId(data.leaveId) : data.leaveId) : undefined,
      feedId: data.feedId ? (typeof data.feedId === 'string' ? new mongoose.Types.ObjectId(data.feedId) : data.feedId) : undefined,
      mentionedBy: data.mentionedBy ? (typeof data.mentionedBy === 'string' ? new mongoose.Types.ObjectId(data.mentionedBy) : data.mentionedBy) : undefined,
      dismissed: false,
      read: false,
    });

    await notification.save();

    // Send push notification
    try {
      const { sendPushNotificationToUser } = await import('@/lib/pushNotificationManager');
      await sendPushNotificationToUser(userId, {
        title: data.title,
        body: data.message,
        icon: '/assets/maverixicon.png',
        badge: '/assets/maverixicon.png',
        tag: `notification-${notification._id}`,
        data: {
          notificationId: (notification._id as mongoose.Types.ObjectId).toString(),
          type: data.type,
          leaveId: data.leaveId?.toString(),
          feedId: data.feedId?.toString(),
          mentionedBy: data.mentionedBy?.toString(),
        },
      });
    } catch (pushError) {
      // Log but don't fail - push notifications are non-critical
      console.error('Error sending push notification:', pushError);
    }

    // Trigger immediate browser notification via API endpoint
    // This will be picked up by the client-side notification listener
    try {
      // Use a non-blocking fetch to trigger notification on client
      fetch('/api/push/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.toString(),
          notificationId: (notification._id as mongoose.Types.ObjectId).toString(),
          title: data.title,
          body: data.message,
          type: data.type,
          leaveId: data.leaveId?.toString(),
          feedId: data.feedId?.toString(),
        }),
      }).catch(() => {
        // Ignore errors - this is non-critical
      });
    } catch (error) {
      // Ignore errors
    }

    return notification;
  } catch (error: any) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

