import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Leave from '@/models/Leave';
import Attendance from '@/models/Attendance';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'hr' && role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const todayDayName = format(today, 'EEEE');

    const [allEmployees, leavesToday, pendingLeaves, clockedInUserIds] = await Promise.all([
      User.find({
        role: { $ne: 'admin' },
        emailVerified: true,
        password: { $exists: true, $ne: null },
      }).select('_id weeklyOff role').lean(),
      Leave.find({
        status: 'approved',
        allottedBy: { $exists: false },
        reason: { $not: { $regex: /penalty|late.*clock.*in|exceeded.*max.*late|auto.*deduct/i } },
        startDate: { $lte: endOfToday },
        endDate: { $gte: today },
      }).select('userId').lean(),
      Leave.countDocuments({ status: 'pending' }),
      Attendance.distinct('userId', { clockIn: { $gte: today, $lte: endOfToday } }),
    ]);

    const totalEmployees = allEmployees.length;
    const employeeCount = allEmployees.filter((e: any) => e.role === 'employee').length;
    const hrCount = allEmployees.filter((e: any) => e.role === 'hr').length;
    const onLeaveCount = new Set(leavesToday.map((l: any) => (l.userId?._id || l.userId)?.toString())).size;
    const weeklyOffCount = allEmployees.filter((e: any) =>
      Array.isArray(e.weeklyOff) && e.weeklyOff.includes(todayDayName)
    ).length;
    const clockedInToday = clockedInUserIds.length;

    const response = NextResponse.json({
      totalEmployees,
      employeeCount,
      hrCount,
      pendingLeaves,
      clockedInToday,
      onLeaveToday: onLeaveCount,
      weeklyOffToday: weeklyOffCount,
    });
    // Stats can tolerate slight staleness - cache for 30 seconds
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Error fetching HR stats:', error);
    const errorResponse = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    errorResponse.headers.set('Cache-Control', 'no-store');
    return errorResponse;
  }
}

