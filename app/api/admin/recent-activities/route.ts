import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [recentClockIns, recentClockOuts, recentLeaveRequests] = await Promise.all([
      Attendance.find({
        clockIn: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('userId', 'name email profileImage')
        .sort({ clockIn: -1 })
        .lean(),

      Attendance.find({
        clockOut: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('userId', 'name email profileImage')
        .sort({ clockOut: -1 })
        .lean(),

      Leave.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        allottedBy: { $exists: false },
      })
        .populate('userId', 'name email profileImage')
        .populate('leaveType', 'name')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const activities: Array<{ type: string; id: string; userId: any; timestamp: string; details: any }> = [];

    recentClockIns.forEach((att: any) => {
      activities.push({
        type: 'clockIn',
        id: String(att._id),
        userId: att.userId,
        timestamp: new Date(att.clockIn).toISOString(),
        details: { date: att.date ? new Date(att.date).toISOString() : undefined },
      });
    });
    recentClockOuts.forEach((att: any) => {
      activities.push({
        type: 'clockOut',
        id: String(att._id) + '_out',
        userId: att.userId,
        timestamp: new Date(att.clockOut).toISOString(),
        details: { date: att.date ? new Date(att.date).toISOString() : undefined },
      });
    });
    recentLeaveRequests.forEach((leave: any) => {
      activities.push({
        type: 'leaveRequest',
        id: String(leave._id),
        userId: leave.userId,
        timestamp: new Date(leave.createdAt).toISOString(),
        details: { leaveType: leave.leaveType?.name || 'Leave', status: leave.status },
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const res = NextResponse.json({ activities });
    res.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (error) {
    console.error('Recent activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
