import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Notification from '@/models/Notification';
import connectDB from '@/lib/mongodb';
import { sendPushNotificationToUser } from '@/lib/pushNotificationManager';

export const dynamic = 'force-dynamic';

// POST - Create a test notification and send push
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as any).id;
    const userName = session.user?.name || 'User';

    // Create a test notification in the database
    const notification = await Notification.create({
      userId,
      title: '🔔 Test Notification',
      message: `Hello ${userName}! This is a test notification from MaveriX. Push notifications are working!`,
      type: 'mention',
      read: false,
      dismissed: false,
    });

    const notificationId = String((notification as any)._id);

    // Send actual push notification
    const pushResult = await sendPushNotificationToUser(userId, {
      title: '🔔 Test Notification',
      body: `Hello ${userName}! This is a test notification from MaveriX. Push notifications are working!`,
      icon: '/assets/maverixicon.png',
      badge: '/assets/maverixicon.png',
      tag: `test-${notificationId}`,
      data: {
        url: '/',
        notificationId: notificationId,
        type: 'test',
      },
    });

    const notificationDoc = notification as any;
    
    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully',
      notification: {
        _id: notificationDoc._id,
        title: notificationDoc.title,
        message: notificationDoc.message,
        type: notificationDoc.type,
      },
      push: {
        success: pushResult.success,
        failed: pushResult.failed,
        message: pushResult.success > 0 
          ? 'Push notification delivered!' 
          : 'No push subscriptions found - make sure notifications are enabled',
      },
    });
  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// GET - Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
