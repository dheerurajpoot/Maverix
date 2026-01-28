import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import LeaveType from '@/models/LeaveType';
import Attendance from '@/models/Attendance';
import Team from '@/models/Team';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    if (role !== 'employee' && role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get start of current week (Monday)
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Execute all queries in parallel for better performance
    const [
      leaves,
      allottedLeaves,
      teams,
      weeklyAttendance,
      monthlyAttendance,
    ] = await Promise.all([
      // Get all leaves for the user (excluding penalty leaves)
      Leave.find({
        userId: userObjectId,
        $or: [
          { reason: { $exists: false } },
          { reason: { $not: { $regex: /penalty|late.*clock.*in|exceeded.*max.*late|leave.*deduction/i } } },
        ],
      })
        .populate('userId', 'name email profileImage')
        .populate('allottedBy', 'name email profileImage')
        .populate('leaveType', 'name description')
        .sort({ createdAt: -1 })
        .lean(),

      // Get allotted leave types
      Leave.find({
        userId: userObjectId,
        allottedBy: { $exists: true, $ne: null },
      })
        .populate('leaveType', 'name description')
        .lean(),

      // Get user's teams
      Team.find({
        $or: [
          { leader: userObjectId },
          { members: userObjectId },
        ],
      })
        .populate('leader', 'name email profileImage mobileNumber designation')
        .populate('members', 'name email profileImage mobileNumber designation')
        .sort({ createdAt: -1 })
        .lean(),

      // Get weekly hours
      Attendance.find({
        userId: userObjectId,
        date: {
          $gte: startOfWeek,
          $lte: endOfWeek,
        },
        clockOut: { $exists: true },
      }).lean(),

      // Get monthly attendance count
      Attendance.countDocuments({
        userId: userObjectId,
        date: { $gte: startOfMonth },
        status: 'present',
      }),
    ]);

    // Process leaves - filter out penalty-related leaves
    const filteredLeaves = leaves.filter((leave: any) => {
      if (leave.reason && /penalty|late.*clock.*in|exceeded.*max.*late/i.test(leave.reason)) {
        return false;
      }
      return true;
    });

    // Calculate pending leaves count
    const pendingLeaves = filteredLeaves.filter(
      (l: any) => l.status === 'pending' && !l.allottedBy
    ).length;

    // Extract unique allotted leave types
    const leaveTypeMap = new Map();
    allottedLeaves.forEach((leave: any) => {
      if (leave.leaveType && leave.leaveType._id) {
        const leaveTypeId = String(leave.leaveType._id);
        if (!leaveTypeMap.has(leaveTypeId)) {
          leaveTypeMap.set(leaveTypeId, leave.leaveType);
        }
      }
    });
    const allottedLeaveTypes = Array.from(leaveTypeMap.values());

    // Calculate total team members
    let totalTeamMembers = 0;
    if (teams && teams.length > 0) {
      teams.forEach((team: any) => {
        totalTeamMembers += team.members?.length || 0;
      });
    }

    // Calculate weekly hours
    const weeklyHours = weeklyAttendance.reduce((sum, record) => {
      return sum + (record.hoursWorked || 0);
    }, 0);

    // Prepare response
    const response = NextResponse.json({
      stats: {
        totalLeaveTypes: allottedLeaveTypes.length,
        pendingLeaves,
        totalInTeam: totalTeamMembers,
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        attendanceThisMonth: monthlyAttendance,
      },
      leaves: filteredLeaves,
      leaveTypes: allottedLeaveTypes,
      teams,
    });

    // Cache for 30 seconds - user-specific data but can tolerate slight staleness
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('Get employee dashboard error:', error);
    const errorResponse = NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    errorResponse.headers.set('Cache-Control', 'no-store');
    return errorResponse;
  }
}
