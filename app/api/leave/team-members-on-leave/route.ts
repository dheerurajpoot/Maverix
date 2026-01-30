import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
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
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    await connectDB();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const teams = await Team.find({
      $or: [{ leader: userObjectId }, { members: userObjectId }],
    })
      .populate('leader', 'name email profileImage')
      .populate('members', 'name email profileImage')
      .lean();

    if (teams.length === 0) {
      return NextResponse.json({ teamMembersOnLeave: [], count: 0 });
    }

    const teamMemberIdSet = new Set<string>();
    for (const team of teams as any[]) {
      if (team.leader?._id?.toString() && team.leader._id.toString() !== userId) {
        teamMemberIdSet.add(team.leader._id.toString());
      }
      if (Array.isArray(team.members)) {
        for (const member of team.members) {
          const id = (member?._id ?? member)?.toString();
          if (id && id !== userId) teamMemberIdSet.add(id);
        }
      }
    }
    const teamMemberIds = [...teamMemberIdSet].map((id) => new mongoose.Types.ObjectId(id));
    if (teamMemberIds.length === 0) {
      return NextResponse.json({ teamMembersOnLeave: [], count: 0 });
    }

    const overlappingLeaves = await Leave.find({
      userId: { $in: teamMemberIds },
      status: { $in: ['pending', 'approved'] },
      allottedBy: { $exists: false },
      reason: { $not: { $regex: /leave.*deduction/i } },
      startDate: { $lte: end },
      endDate: { $gte: start },
    })
      .populate('userId', 'name email profileImage')
      .populate('leaveType', 'name')
      .lean();

    const membersOnLeaveMap = new Map<string, any>();
    for (const leave of overlappingLeaves as any[]) {
      const uid = (leave.userId?._id ?? leave.userId)?.toString();
      if (!uid) continue;
      if (!membersOnLeaveMap.has(uid)) {
        const user = leave.userId;
        membersOnLeaveMap.set(uid, {
          _id: uid,
          name: user?.name ?? 'Unknown',
          email: user?.email ?? '',
          profileImage: user?.profileImage,
          leaves: [],
        });
      }
      membersOnLeaveMap.get(uid).leaves.push({
        leaveType: leave.leaveType?.name ?? leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        status: leave.status,
        halfDayType: leave.halfDayType,
        days: leave.days,
      });
    }

    const teamMembersOnLeave = Array.from(membersOnLeaveMap.values()).filter(
      (m: any) => m.leaves?.length > 0
    );

    const response = NextResponse.json({ teamMembersOnLeave, count: teamMembersOnLeave.length });
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error: any) {
    console.error('Get team members on leave error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

