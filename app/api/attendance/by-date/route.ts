import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    
    // Only admin and hr can access this endpoint
    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const dateParam = request.nextUrl.searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const selectedDate = new Date(dateParam);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all attendance records for the selected date
    const attendance = await Attendance.find({
      date: { $gte: selectedDate, $lt: nextDay },
    })
      .populate('userId', 'name email profileImage designation weeklyOff')
      .sort({ clockIn: -1 })
      .lean();

    return NextResponse.json({ attendance });
  } catch (error: any) {
    console.error('Get attendance by date error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

