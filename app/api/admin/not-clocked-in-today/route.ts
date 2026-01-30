import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';

export const dynamic = 'force-dynamic';

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

    const [allEmployees, clockedInUserIds] = await Promise.all([
      User.find({
        role: { $ne: 'admin' },
        emailVerified: true,
        password: { $exists: true, $ne: null },
      })
        .select('_id name email profileImage designation')
        .lean(),

      Attendance.distinct('userId', {
        clockIn: { $gte: today, $lte: endOfToday },
      }),
    ]);

    const clockedInSet = new Set(clockedInUserIds.map((id) => id.toString()));

    const notClockedIn = allEmployees
      .filter((emp) => !clockedInSet.has(emp._id.toString()))
      .map((emp) => ({
        _id: emp._id.toString(),
        name: emp.name || '',
        email: emp.email || '',
        profileImage: emp.profileImage && String(emp.profileImage).trim() ? emp.profileImage : null,
        designation: emp.designation || null,
      }));

    const res = NextResponse.json({ employees: notClockedIn, count: notClockedIn.length });
    res.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return res;
  } catch (error) {
    console.error('Not clocked in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
