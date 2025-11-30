import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';

export const dynamic = 'force-dynamic';

// PATCH - Update a notification (mark as read or dismiss)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();

    await connectDB();

    const notification = await Notification.findById(params.id);

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Ensure user can only update their own notifications
    if (notification.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update read status if provided
    if (body.read !== undefined) {
      notification.read = body.read;
      if (body.read) {
        notification.readAt = new Date();
      } else {
        notification.readAt = undefined;
      }
    }

    // Update dismissed status if provided
    if (body.dismissed !== undefined) {
      notification.dismissed = body.dismissed;
      if (body.dismissed) {
        notification.dismissedAt = new Date();
      } else {
        notification.dismissedAt = undefined;
      }
    }

    await notification.save();

    return NextResponse.json({
      message: 'Notification updated successfully',
      notification,
    });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

