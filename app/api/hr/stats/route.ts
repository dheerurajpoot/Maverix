import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import Attendance from '@/models/Attendance';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || ((session.user as any).role !== 'hr' && (session.user as any).role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const [pendingLeaves, todayAttendance, approvedLeaves] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      Attendance.countDocuments({ date: new Date() }),
      Leave.countDocuments({ status: 'approved' }),
    ]);

    return NextResponse.json({
      pendingLeaves,
      todayAttendance,
      approvedLeaves,
    });
  } catch (error) {
    console.error('Error fetching HR stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

