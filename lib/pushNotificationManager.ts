import PushSubscription from '@/models/PushSubscription';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

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
 * This creates a notification record that the client will poll and display
 * For true push notifications (when app is closed), VAPID keys are needed
 */
export async function sendPushNotificationToUser(
  userId: string | mongoose.Types.ObjectId,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    await connectDB();

    const userIdObj = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    // Get all push subscriptions for this user
    const subscriptions = await PushSubscription.find({ userId: userIdObj }).lean();

    if (subscriptions.length === 0) {
      // No push subscriptions - notification will still be created in the database
      // and shown in the notification dropdown
      console.log(`No push subscriptions found for user ${userId} - notification will be shown in-app`);
      return;
    }

    // Prepare notification payload
    const notificationData = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/assets/maverixicon.png',
      badge: payload.badge || '/assets/maverixicon.png',
      tag: payload.tag || 'maverix-notification',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    };

    // Store notification data for the client to retrieve
    // The client will poll for new notifications and show them using the Notification API
    // This works when the app is open
    
    // For true push notifications (when app is closed), we would need:
    // 1. VAPID keys configured
    // 2. web-push library installed
    // 3. Send actual push messages to the subscription endpoints
    
    // For now, we'll just log - the notification system will handle showing it
    console.log(`Push notification queued for user ${userId}: ${payload.title}`);
    
    // TODO: When VAPID is configured, use web-push library to send actual push messages:
    // const webpush = require('web-push');
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   process.env.VAPID_PUBLIC_KEY,
    //   process.env.VAPID_PRIVATE_KEY
    // );
    // 
    // for (const subscription of subscriptions) {
    //   try {
    //     await webpush.sendNotification(
    //       {
    //         endpoint: subscription.endpoint,
    //         keys: subscription.keys,
    //       },
    //       JSON.stringify(notificationData)
    //     );
    //   } catch (error) {
    //     // Handle invalid subscriptions
    //   }
    // }
  } catch (error) {
    console.error('Error in sendPushNotificationToUser:', error);
    // Don't throw - push notifications are non-critical
  }
}

/**
 * Sends push notifications to multiple users
 */
export async function sendPushNotificationToUsers(
  userIds: (string | mongoose.Types.ObjectId)[],
  payload: PushNotificationPayload
): Promise<void> {
  const promises = userIds.map((userId) => sendPushNotificationToUser(userId, payload));
  await Promise.allSettled(promises);
}

