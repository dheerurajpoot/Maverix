import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';

export const dynamic = 'force-dynamic';

const MAX_FETCH_PER_TYPE = 150;
const DEFAULT_LIMIT = 8;

type ActivityItem = {
  type: string;
  id: string;
  userId: { _id: string; name: string; email: string; profileImage?: string };
  timestamp: string;
  details: { date?: string; leaveType?: string; status?: string };
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || DEFAULT_LIMIT, 50);
    const skip = Math.max(0, Number(request.nextUrl.searchParams.get('skip')) || 0);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [recentClockIns, recentClockOuts, recentLeaveRequests] = await Promise.all([
      Attendance.find({
        clockIn: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('userId', 'name email profileImage')
        .sort({ clockIn: -1 })
        .limit(MAX_FETCH_PER_TYPE)
        .lean(),

      Attendance.find({
        clockOut: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('userId', 'name email profileImage')
        .sort({ clockOut: -1 })
        .limit(MAX_FETCH_PER_TYPE)
        .lean(),

      Leave.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        allottedBy: { $exists: false },
      })
        .populate('userId', 'name email profileImage')
        .populate('leaveType', 'name')
        .sort({ createdAt: -1 })
        .limit(MAX_FETCH_PER_TYPE)
        .lean(),
    ]);

    const activities: ActivityItem[] = [];

    type ClockInRow = { _id: unknown; userId: ActivityItem['userId']; clockIn: Date; date?: Date };
    for (const att of recentClockIns as unknown as ClockInRow[]) {
      activities.push({
        type: 'clockIn',
        id: String(att._id),
        userId: att.userId,
        timestamp: new Date(att.clockIn).toISOString(),
        details: { date: att.date ? new Date(att.date).toISOString() : undefined },
      });
    }
    type ClockOutRow = { _id: unknown; userId: ActivityItem['userId']; clockOut: Date; date?: Date };
    for (const att of recentClockOuts as unknown as ClockOutRow[]) {
      activities.push({
        type: 'clockOut',
        id: `${att._id}_out`,
        userId: att.userId,
        timestamp: new Date(att.clockOut).toISOString(),
        details: { date: att.date ? new Date(att.date).toISOString() : undefined },
      });
    }
    type LeaveRow = { _id: unknown; userId: ActivityItem['userId']; leaveType?: { name?: string }; createdAt: Date; status?: string };
    for (const leave of recentLeaveRequests as unknown as LeaveRow[]) {
      activities.push({
        type: 'leaveRequest',
        id: String(leave._id),
        userId: leave.userId,
        timestamp: new Date(leave.createdAt).toISOString(),
        details: { leaveType: leave.leaveType?.name || 'Leave', status: leave.status },
      });
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = activities.length;
    const paginated = activities.slice(skip, skip + limit);
    const hasMore = skip + paginated.length < total;

    const res = NextResponse.json({
      activities: paginated,
      total,
      hasMore,
    });
    res.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (error) {
    console.error('Recent activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
