import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Feed from '@/models/Feed';
import User from '@/models/User';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const posts = await Feed.find()
      .populate('userId', 'name email profileImage role designation')
      .populate({
        path: 'mentions',
        select: 'name email profileImage mobileNumber role designation',
        strictPopulate: false,
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const response = NextResponse.json({ posts });
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('Get feed error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content must be less than 5000 characters' },
        { status: 400 }
      );
    }

    await connectDB();

    const userId = (session.user as any).id;

    const mentionRegex = /@([\w\s]+?)(?=\s|$|@)/g;
    const mentionMatches = [...(content.match(mentionRegex) || [])].map((m) => m.substring(1).trim()).filter(Boolean);
    const uniqueMentions = [...new Set(mentionMatches)];
    const mentionUserIds: string[] = [];

    if (uniqueMentions.length > 0) {
      const orConditions: any[] = [];
      for (const text of uniqueMentions) {
        const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        orConditions.push(
          { email: text },
          { name: { $regex: new RegExp(`^${escaped}$`, 'i') } },
          { name: { $regex: new RegExp(`^${(text.split(' ')[0] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } }
        );
      }
      const users = await User.find({ $or: orConditions }).select('_id').lean();
      const seen = new Set<string>();
      for (const u of users) {
        const id = u._id?.toString();
        if (id && !seen.has(id)) {
          seen.add(id);
          mentionUserIds.push(id);
        }
      }
    }

    const feed = new Feed({
      userId,
      content: content.trim(),
      mentions: mentionUserIds,
    });

    await feed.save();
    await feed.populate('userId', 'name email profileImage role designation');
    await feed.populate({
      path: 'mentions',
      select: 'name email profileImage mobileNumber role designation',
      strictPopulate: false,
    });

    return NextResponse.json({
      message: 'Post created successfully',
      post: feed,
    });
  } catch (error: any) {
    console.error('Create feed error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

