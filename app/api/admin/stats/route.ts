import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Leave from '@/models/Leave';
import Attendance from '@/models/Attendance';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const PENALTY_REASON_REGEX = /penalty|late.*clock.*in|exceeded.*max.*late|auto.*deduct/i;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const todayDayName = format(today, 'EEEE');

    const [allEmployees, pendingLeaves, clockedInUserIds, leavesToday] = await Promise.all([
      User.find({
        role: { $ne: 'admin' },
        emailVerified: true,
        password: { $exists: true, $ne: null },
      })
        .select('_id weeklyOff role')
        .lean(),

      Leave.countDocuments({ status: 'pending' }),

      Attendance.distinct('userId', {
        clockIn: { $gte: today, $lte: endOfToday },
      }),

      Leave.find({
        status: 'approved',
        allottedBy: { $exists: false },
        $or: [
          { reason: { $exists: false } },
          { reason: null },
          { reason: { $not: { $regex: PENALTY_REASON_REGEX } } },
        ],
        startDate: { $lte: endOfToday },
        endDate: { $gte: today },
      })
        .select('userId reason')
        .lean(),
    ]);

    const userIdsOnLeave = new Set(
      leavesToday
        .filter((l: any) => !(l.reason && PENALTY_REASON_REGEX.test(l.reason)))
        .map((l: any) => (l.userId?._id ?? l.userId).toString())
    );

    const employeeCount = allEmployees.filter((e: any) => e.role === 'employee').length;
    const hrCount = allEmployees.filter((e: any) => e.role === 'hr').length;
    const weeklyOffCount = allEmployees.filter(
      (e: any) => Array.isArray(e.weeklyOff) && e.weeklyOff.includes(todayDayName)
    ).length;

    const res = NextResponse.json({
      totalEmployees: allEmployees.length,
      employeeCount,
      hrCount,
      pendingLeaves,
      clockedInToday: clockedInUserIds.length,
      onLeaveToday: userIdsOnLeave.size,
      weeklyOffToday: weeklyOffCount,
    });
    res.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
