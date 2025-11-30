import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Announcement from '@/models/Announcement';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// POST - Vote on a poll option
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { optionIndex } = await request.json();

    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return NextResponse.json(
        { error: 'Valid option index is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const announcementId = params.id;

    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return NextResponse.json({ error: 'Invalid announcement ID' }, { status: 400 });
    }

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    if (!announcement.poll) {
      return NextResponse.json({ error: 'This announcement does not have a poll' }, { status: 400 });
    }

    if (optionIndex >= announcement.poll.options.length) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Check if user has already voted
    const hasVoted = announcement.poll.options.some((option: any) =>
      option.votes.some((vote: any) => vote.userId.toString() === userId)
    );

    if (hasVoted) {
      // Remove existing vote
      announcement.poll.options.forEach((option: any) => {
        option.votes = option.votes.filter(
          (vote: any) => vote.userId.toString() !== userId
        );
      });
    }

    // Add new vote
    announcement.poll.options[optionIndex].votes.push({
      userId: userIdObj,
      votedAt: new Date(),
    });

    await announcement.save();
    await announcement.populate('createdBy', 'name email profileImage role');
    await announcement.populate('poll.options.votes.userId', 'name email profileImage');

    return NextResponse.json({
      message: 'Vote recorded successfully',
      announcement,
    });
  } catch (error: any) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

