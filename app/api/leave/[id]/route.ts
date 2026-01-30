import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import LeaveType from '@/models/LeaveType';
import mongoose from 'mongoose';
import { sendLeaveStatusNotificationToEmployee } from '@/utils/sendEmail';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

function leaveUserId(leave: any): string {
  const uid = leave.userId;
  return (typeof uid === 'object' && uid?._id ? uid._id : uid)?.toString() ?? '';
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;

    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, rejectionReason } = await request.json();

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400 });
    }

    await connectDB();

    const leave = await Leave.findById(params.id);

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const userId = (session.user as any).id;
    if (role === 'hr' && leaveUserId(leave) === userId) {
      return NextResponse.json({ 
        error: 'HR cannot approve their own leave requests. Please contact admin for approval.' 
      }, { status: 403 });
    }

    // Store previous status BEFORE updating
    const previousStatus = leave.status;

    if (!leave.allottedBy) {
      const [allottedLeave, leaveTypeDoc] = await Promise.all([
        Leave.findOne({
          userId: leave.userId,
          leaveType: leave.leaveType,
          allottedBy: { $exists: true, $ne: null },
        }),
        LeaveType.findById(leave.leaveType).lean(),
      ]);
      const leaveTypeName = leaveTypeDoc?.name?.toLowerCase() ?? '';
      const isShortDayLeaveType = /shortday|short-day|short\s*day/.test(leaveTypeName);

      if (allottedLeave) {
        if (isShortDayLeaveType) {
          // Handle shortday leave types with hours/minutes
          const requestedHours = leave.hours || 0;
          const requestedMinutes = leave.minutes || 0;
          const requestedTotalMinutes = requestedHours * 60 + requestedMinutes;

          if (status === 'approved' && previousStatus !== 'approved') {
            const approvedRequests = await Leave.find({
              userId: leave.userId,
              leaveType: leave.leaveType,
              allottedBy: { $exists: false },
              status: 'approved',
              _id: { $ne: leave._id },
            })
              .select('hours minutes')
              .lean();
            const totalUsedMinutes = approvedRequests.reduce(
              (sum: number, r: any) => sum + (r.hours || 0) * 60 + (r.minutes || 0),
              0
            );

            // Calculate remaining
            const totalAllottedMinutes = (allottedLeave.hours || 0) * 60 + (allottedLeave.minutes || 0);
            const actualRemainingMinutes = Math.max(0, totalAllottedMinutes - totalUsedMinutes);
            const newRemainingMinutes = actualRemainingMinutes - requestedTotalMinutes;

            // Update remaining hours and minutes
            allottedLeave.remainingHours = Math.floor(newRemainingMinutes / 60);
            allottedLeave.remainingMinutes = newRemainingMinutes % 60;
            await allottedLeave.save();

            // Create deduction history entry for shortday leave (not treated as "on leave")
            const deductionHistory = new Leave({
              userId: leave.userId,
              leaveType: leave.leaveType,
              hours: requestedHours,
              minutes: requestedMinutes,
              startDate: leave.startDate,
              endDate: leave.endDate,
              reason: `Leave deduction: ${requestedHours}h ${requestedMinutes}m deducted from allotted ${leaveTypeDoc?.name || 'leave'} balance`,
              status: 'approved',
              allottedBy: (session.user as any).id, // Mark as system-generated deduction history
              allottedAt: new Date(),
              approvedBy: (session.user as any).id,
              approvedAt: new Date(),
            });
            await deductionHistory.save();
          } else if (status === 'rejected' && previousStatus === 'approved') {
            const approvedRequests = await Leave.find({
              userId: leave.userId,
              leaveType: leave.leaveType,
              allottedBy: { $exists: false },
              status: 'approved',
              _id: { $ne: leave._id },
            })
              .select('hours minutes')
              .lean();
            const totalUsedMinutes = approvedRequests.reduce(
              (sum: number, r: any) => sum + (r.hours || 0) * 60 + (r.minutes || 0),
              0
            );

            // Calculate remaining
            const totalAllottedMinutes = (allottedLeave.hours || 0) * 60 + (allottedLeave.minutes || 0);
            const actualRemainingMinutes = Math.max(0, totalAllottedMinutes - totalUsedMinutes);

            // Update remaining hours and minutes
            allottedLeave.remainingHours = Math.floor(actualRemainingMinutes / 60);
            allottedLeave.remainingMinutes = actualRemainingMinutes % 60;
            await allottedLeave.save();
          }
        } else {
          // Handle regular leave types with days
          const requestedDays = leave.days || 0;

          if (status === 'approved' && previousStatus !== 'approved') {
            const approvedRequests = await Leave.find({
              userId: leave.userId,
              leaveType: leave.leaveType,
              allottedBy: { $exists: false },
              status: 'approved',
              _id: { $ne: leave._id },
            })
              .select('days')
              .lean();
            const totalUsed = approvedRequests.reduce((sum: number, r: any) => sum + (r.days || 0), 0);
            const actualRemainingDays = Math.max(0, (allottedLeave.days || 0) - totalUsed);

            // Update remainingDays in allotted leave
            allottedLeave.remainingDays = actualRemainingDays - requestedDays;
            await allottedLeave.save();

            // Create deduction history entry (not treated as "on leave")
            const deductionHistory = new Leave({
              userId: leave.userId,
              leaveType: leave.leaveType,
              days: requestedDays,
              startDate: leave.startDate,
              endDate: leave.endDate,
              reason: `Leave deduction: ${requestedDays} day(s) deducted from allotted ${leaveTypeDoc?.name || 'leave'} balance`,
              status: 'approved',
              allottedBy: (session.user as any).id, // Mark as system-generated deduction history
              allottedAt: new Date(),
              approvedBy: (session.user as any).id,
              approvedAt: new Date(),
            });
            await deductionHistory.save();
          } else if (status === 'rejected' && previousStatus === 'approved') {
            const approvedRequests = await Leave.find({
              userId: leave.userId,
              leaveType: leave.leaveType,
              allottedBy: { $exists: false },
              status: 'approved',
              _id: { $ne: leave._id },
            })
              .select('days')
              .lean();
            const totalUsed = approvedRequests.reduce((sum: number, r: any) => sum + (r.days || 0), 0);
            allottedLeave.remainingDays = Math.max(0, (allottedLeave.days || 0) - totalUsed);
            await allottedLeave.save();
          }
        }
      }
    }

    const updateData: any = {
      status,
      approvedBy: (session.user as any).id,
      approvedAt: new Date(),
      ...(status === 'rejected' && rejectionReason ? { rejectionReason } : status === 'approved' ? { rejectionReason: null } : {}),
    };

    const updatedLeave = await Leave.findByIdAndUpdate(
      params.id,
      updateData,
      { 
        new: true, // Return updated document
        runValidators: true, // Run schema validators
        overwrite: false, // Don't overwrite entire document
      }
    );

    if (!updatedLeave) {
      return NextResponse.json({ error: 'Leave not found after update' }, { status: 404 });
    }

    // Populate for response
    await updatedLeave.populate('userId', 'name email profileImage');
    await updatedLeave.populate('leaveType', 'name description');
    if (updatedLeave.approvedBy) {
      await updatedLeave.populate('approvedBy', 'name email');
    }

    try {
      const user = updatedLeave.userId as any;
      const leaveType = updatedLeave.leaveType as any;
      const approver = updatedLeave.approvedBy as any;
      if (user?.email && leaveType?.name) {
        const ltName = String(leaveType.name).toLowerCase();
        const isShortDay = /shortday|short-day|short\s*day/.test(ltName);
        await sendLeaveStatusNotificationToEmployee({
          employeeName: user.name || 'Employee',
          employeeEmail: user.email,
          leaveType: leaveType.name || 'Leave',
          days: updatedLeave.days || 0,
          startDate: format(new Date(updatedLeave.startDate), 'MMM dd, yyyy'),
          endDate: format(new Date(updatedLeave.endDate), 'MMM dd, yyyy'),
          status: status as 'approved' | 'rejected',
          rejectionReason: status === 'rejected' ? updatedLeave.rejectionReason : undefined,
          approvedBy: approver?.name,
          halfDayType: (updatedLeave as any).halfDayType,
          shortDayTime: (updatedLeave as any).shortDayTime,
          hours: isShortDay ? ((updatedLeave as any).hours ?? 0) : undefined,
          minutes: isShortDay ? ((updatedLeave as any).minutes ?? 0) : undefined,
        });
      }
    } catch (emailError) {
      console.error('Error sending leave status notification email:', emailError);
    }

    return NextResponse.json({
      message: `Leave ${status} successfully`,
      leave: updatedLeave,
    });
  } catch (error: any) {
    console.error('Update leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid leave ID' }, { status: 400 });
    }

    await connectDB();

    const leave = await Leave.findById(params.id);

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    if (role === 'employee') {
      if (leaveUserId(leave) !== userId) {
        return NextResponse.json({ error: 'You can only delete your own leave requests' }, { status: 403 });
      }
      if (leave.status !== 'pending') {
        return NextResponse.json({ error: 'You can only delete pending leave requests' }, { status: 400 });
      }
    } else if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await Leave.findByIdAndDelete(params.id);

    return NextResponse.json({
      message: 'Leave deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;

    if (role !== 'admin' && role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { days, startDate, endDate, reason, carryForward, leaveType } = await request.json();

    await connectDB();

    const leave = await Leave.findById(params.id);

    if (!leave) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    // Only allow editing allotted leaves
    if (!leave.allottedBy) {
      return NextResponse.json({ error: 'Cannot edit non-allotted leave' }, { status: 400 });
    }

    if (leaveType && leaveType !== leave.leaveType.toString()) {
      const leaveTypeId = new mongoose.Types.ObjectId(leaveType);
      const existingLeave = await Leave.findOne({
        userId: leave.userId,
        leaveType: leaveTypeId,
        allottedBy: { $exists: true, $ne: null },
        _id: { $ne: leave._id },
      });
      if (existingLeave) {
        const leaveTypeDoc = await LeaveType.findById(leaveTypeId).select('name').lean();
        return NextResponse.json(
          { error: `Already allotted ${leaveTypeDoc?.name ?? 'this leave type'}` },
          { status: 400 }
        );
      }
      leave.leaveType = leaveTypeId;
    }

    if (days !== undefined) {
      const daysValue = parseFloat(String(days));
      if (isNaN(daysValue) || daysValue <= 0) {
        return NextResponse.json(
          { error: 'Invalid days value' },
          { status: 400 }
        );
      }
      leave.days = daysValue;
      // Update remaining days if it exists
      if (leave.remainingDays !== undefined) {
        leave.remainingDays = daysValue;
      }
    }

    if (startDate) {
      leave.startDate = new Date(startDate);
    }

    if (endDate) {
      leave.endDate = new Date(endDate);
    }

    if (reason !== undefined) {
      leave.reason = reason;
    }

    if (carryForward !== undefined) {
      leave.carryForward = carryForward;
    }

    await leave.save();
    await leave.populate('userId', 'name email profileImage');
    await leave.populate('allottedBy', 'name email profileImage');
    await leave.populate('leaveType', 'name description');

    return NextResponse.json({
      message: 'Leave updated successfully',
      leave,
    });
  } catch (error: any) {
    console.error('Update leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

