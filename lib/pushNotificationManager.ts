import PushSubscription from '@/models/PushSubscription';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import webpush from 'web-push';

// Configure web-push with VAPID credentials
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@maverix.com';

// Initialize web-push if VAPID keys are configured
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  console.log('[WebPush] VAPID configured successfully');
} else {
  console.warn('[WebPush] VAPID keys not configured - push notifications will not work');
}

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Sends a push notification to a specific user
 * This sends actual push notifications via web-push
 */
export async function sendPushNotificationToUser(
  userId: string | mongoose.Types.ObjectId,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const result = { success: 0, failed: 0 };

  // Check if VAPID is configured
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[WebPush] Cannot send push - VAPID keys not configured');
    return result;
  }

  try {
    await connectDB();

    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // Get all push subscriptions for this user
    const subscriptions = await PushSubscription.find({ userId: userIdObj }).lean();

    if (subscriptions.length === 0) {
      console.log(`[WebPush] No push subscriptions found for user ${userId}`);
      return result;
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/assets/maverixicon.png',
      badge: payload.badge || '/assets/maverixicon.png',
      tag: payload.tag || 'maverix-notification',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    });

    // Send push notification to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          notificationPayload
        );
        console.log(`[WebPush] Notification sent to subscription: ${subscription.endpoint.slice(0, 50)}...`);
        result.success++;
      } catch (error: any) {
        console.error(`[WebPush] Failed to send notification:`, error.message);
        result.failed++;

        // If subscription is invalid (gone), remove it
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log(`[WebPush] Removing invalid subscription: ${subscription.endpoint.slice(0, 50)}...`);
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
      }
    });

    await Promise.all(sendPromises);

    console.log(`[WebPush] Notification sent to user ${userId}: ${result.success} success, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('[WebPush] Error in sendPushNotificationToUser:', error);
    return result;
  }
}

/**
 * Sends push notifications to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: (string | mongoose.Types.ObjectId)[],
  payload: PushNotificationPayload
): Promise<{ totalSuccess: number; totalFailed: number }> {
  const totalResult = { totalSuccess: 0, totalFailed: 0 };

  const results = await Promise.all(
    userIds.map((userId) => sendPushNotificationToUser(userId, payload))
  );

  results.forEach((result) => {
    totalResult.totalSuccess += result.success;
    totalResult.totalFailed += result.failed;
  });

  return totalResult;
}

/**
 * Sends push notifications to all users with a specific role
 */
export async function sendPushNotificationToRole(
  role: 'admin' | 'hr' | 'employee',
  payload: PushNotificationPayload
): Promise<{ totalSuccess: number; totalFailed: number }> {
  try {
    await connectDB();

    // Import User model dynamically to avoid circular dependencies
    const User = (await import('@/models/User')).default;

    const users = await User.find({ role, approved: true }).select('_id').lean();
    const userIds = users.map((user: any) => user._id);

    return sendPushNotificationToUsers(userIds, payload);
  } catch (error) {
    console.error('[WebPush] Error in sendPushNotificationToRole:', error);
    return { totalSuccess: 0, totalFailed: 0 };
  }
}
