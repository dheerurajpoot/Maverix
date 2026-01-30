import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import LeaveType from '@/models/LeaveType';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const isShortDayLeaveType = (name?: string) =>
  /shortday|short-day|short\s*day/.test((name ?? '').toLowerCase());

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, leaveType, days, hours, minutes, carryForward, reason } = await request.json();
    const allottedBy = (session.user as any).id;

    if (!userId || !leaveType) {
      return NextResponse.json(
        { error: 'Employee and leave type are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const leaveTypeId = new mongoose.Types.ObjectId(leaveType);
    const leaveTypeExists = await LeaveType.findById(leaveTypeId).lean();
    if (!leaveTypeExists) {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    const shortDay = isShortDayLeaveType(leaveTypeExists.name);
    if (shortDay) {
      const h = hours != null ? parseInt(String(hours), 10) : 0;
      const m = minutes != null ? parseInt(String(minutes), 10) : 0;
      if ((isNaN(h) && isNaN(m)) || (h === 0 && m === 0)) {
        return NextResponse.json(
          { error: 'Employee, leave type, and hours/minutes are required for shortday leave' },
          { status: 400 }
        );
      }
    } else if (!days) {
      return NextResponse.json(
        { error: 'Employee, leave type, and days are required' },
        { status: 400 }
      );
    }

    // Check if this employee already has this leave type allotted
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const existingLeave = await Leave.findOne({
      userId: userIdObj,
      leaveType: leaveTypeId,
      allottedBy: { $exists: true, $ne: null },
    });

    if (existingLeave) {
      return NextResponse.json(
        { error: `Already allotted ${leaveTypeExists.name}` },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    const allottedByObj = new mongoose.Types.ObjectId(allottedBy);

    const leaveData: any = {
      userId: userIdObj,
      leaveType: leaveTypeId,
      startDate,
      endDate,
      reason: reason || 'Allotted by admin/HR',
      status: 'approved',
      allottedBy: allottedByObj,
      allottedAt: new Date(),
      approvedBy: allottedByObj,
      approvedAt: new Date(),
      carryForward: carryForward || false,
    };

    if (shortDay) {
      const totalMinutes = (hours != null ? parseInt(String(hours), 10) : 0) * 60 +
        (minutes != null ? parseInt(String(minutes), 10) : 0);
      const normalizedHours = Math.floor(totalMinutes / 60);
      const normalizedMinutes = totalMinutes % 60;
      leaveData.days = 0;
      leaveData.hours = normalizedHours;
      leaveData.minutes = normalizedMinutes;
      leaveData.remainingHours = normalizedHours;
      leaveData.remainingMinutes = normalizedMinutes;
    } else {
      const daysValue = parseFloat(String(days));
      if (isNaN(daysValue) || daysValue <= 0) {
        return NextResponse.json({ error: 'Invalid days value' }, { status: 400 });
      }
      endDate.setDate(startDate.getDate() + Math.ceil(daysValue) - 1);
      leaveData.days = daysValue;
      leaveData.remainingDays = daysValue;
    }

    const leave = new Leave(leaveData);

    await leave.save();
    await leave.populate('userId', 'name email profileImage');
    await leave.populate('allottedBy', 'name email profileImage');
    await leave.populate('leaveType', 'name description');

    return NextResponse.json({
      message: 'Leave allotted successfully',
      leave,
    });
  } catch (error: any) {
    console.error('Allot leave error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e: any) => e.message);
      return NextResponse.json({ error: `Validation failed: ${messages.join(', ')}` }, { status: 400 });
    }
    if (error.message?.includes('enum')) {
      return NextResponse.json({ error: 'Invalid leave type. Please refresh and try again.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

