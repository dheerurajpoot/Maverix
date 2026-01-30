import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Penalty from '@/models/Penalty';
import Finance from '@/models/Finance';
import mongoose from 'mongoose';
import { generateEmployeeId, extractEmployeeIdSequence } from '@/utils/generateEmployeeId';

export const dynamic = 'force-dynamic';

const CLOCK_IN_TIME_REGEX = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { name, role, designation, joiningYear, weeklyOff, clockInTime } = await request.json();

    await connectDB();

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousJoiningYear = user.joiningYear ?? null;

    // Prevent HR from changing user roles
    if (userRole === 'hr' && role && role !== user.role) {
      return NextResponse.json({ error: 'HR cannot change user roles' }, { status: 403 });
    }

    if (name) user.name = name;
    // Only allow role change if user is admin
    if (role && userRole === 'admin') {
      user.role = role;
    }
    if (designation !== undefined) {
      user.designation = designation && String(designation).trim() !== '' ? String(designation).trim() : undefined;
    }

    if (joiningYear !== undefined) {
      const isClearing = joiningYear === null || joiningYear === '' ||
        (typeof joiningYear === 'string' && joiningYear.trim() === '');
      if (isClearing) {
        user.joiningYear = undefined;
        (user as any).joiningYearUpdatedAt = undefined;
        user.empId = undefined;
        user.markModified('joiningYear');
        user.markModified('joiningYearUpdatedAt');
        user.markModified('empId');
      } else {
        const yearNum = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : Number(joiningYear);
        if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
          user.joiningYear = yearNum;
          if (previousJoiningYear == null) {
            (user as any).joiningYearUpdatedAt = new Date();
            user.markModified('joiningYearUpdatedAt');
          }
        }
      }
    }

    if (weeklyOff !== undefined) {
      user.weeklyOff = Array.isArray(weeklyOff)
        ? weeklyOff.filter((d) => d && typeof d === 'string' && d.trim())
        : [];
      user.markModified('weeklyOff');
    }

    if (clockInTime !== undefined) {
      const timeValue = typeof clockInTime === 'string' ? clockInTime.trim() : '';
      if (timeValue === 'N/R') {
        await User.updateOne(
          { _id: params.id },
          { $set: { clockInTime: 'N/R' } },
          { runValidators: false }
        );
        (user as any).clockInTime = 'N/R';
      } else if (timeValue !== '') {
        if (!CLOCK_IN_TIME_REGEX.test(timeValue)) {
          return NextResponse.json(
            { error: 'Invalid clock-in time format. Use HH:mm (e.g. 09:30)' },
            { status: 400 }
          );
        }
        user.clockInTime = timeValue;
        user.markModified('clockInTime');
      } else {
        user.clockInTime = undefined;
        user.markModified('clockInTime');
      }
    }

    await user.save();

    // Employee ID:
    // - When joiningYear is set, empId should be YYYYEMP-### using a GLOBAL sequence.
    // - If joiningYear changes later, update only the year prefix and keep the same ### sequence.
    if (joiningYear !== undefined && user.joiningYear) {
      const currentEmpId = user.empId;
      if (!currentEmpId) {
        const empId = await generateEmployeeId(user.joiningYear);
        await User.findByIdAndUpdate(params.id, { $set: { empId } });
      } else {
        const seq = extractEmployeeIdSequence(currentEmpId);
        const expectedPrefix = `${user.joiningYear}EMP-`;
        if (seq !== null && !currentEmpId.startsWith(expectedPrefix)) {
          const newEmpId = `${user.joiningYear}EMP-${String(seq).padStart(3, '0')}`;
          await User.findByIdAndUpdate(params.id, { $set: { empId: newEmpId } });
        }
      }
    }
    
    const updatedUser = await User.findById(params.id)
      .select('_id name email role empId designation profileImage mobileNumber joiningYear joiningYearUpdatedAt emailVerified approved weeklyOff clockInTime createdAt updatedAt')
      .lean();

    return NextResponse.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error: any) {
    console.error('Update user error:', error);
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
    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(params.id).select('role').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(params.id);

    try {
      await Promise.all([
        Attendance.deleteMany({ userId }),
        Leave.deleteMany({ userId }),
        Penalty.deleteMany({ userId }),
        Finance.deleteMany({ userId }),
      ]);
    } catch (deleteError: any) {
      console.error('Error deleting related records:', deleteError);
    }
    await User.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

