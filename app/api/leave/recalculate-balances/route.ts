import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

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

    await connectDB();

    const allottedLeaves = await Leave.find({
      allottedBy: { $exists: true, $ne: null },
    })
      .select('_id userId leaveType days')
      .lean();

    if (allottedLeaves.length === 0) {
      return NextResponse.json({ message: 'Recalculated balances for 0 allotted leaves', updated: 0 });
    }

    const approvedByUserAndType = await Leave.aggregate([
      { $match: { status: 'approved', allottedBy: { $exists: false } } },
      { $group: { _id: { userId: '$userId', leaveType: '$leaveType' }, totalDays: { $sum: '$days' } } },
    ]);
    const usedMap = new Map(
      approvedByUserAndType.map((r: any) => [
        `${r._id.userId?.toString()}-${r._id.leaveType?.toString()}`,
        r.totalDays,
      ])
    );

    let updated = 0;
    const bulkOps = allottedLeaves.map((allotted: any) => {
      const key = `${allotted.userId?.toString()}-${allotted.leaveType?.toString()}`;
      const totalUsed = usedMap.get(key) || 0;
      const remainingDays = Math.max(0, (allotted.days || 0) - totalUsed);
      updated++;
      return {
        updateOne: {
          filter: { _id: allotted._id },
          update: { $set: { remainingDays } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await Leave.bulkWrite(bulkOps);
    }

    return NextResponse.json({
      message: `Recalculated balances for ${updated} allotted leaves`,
      updated,
    });
  } catch (error: any) {
    console.error('Recalculate balances error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}


