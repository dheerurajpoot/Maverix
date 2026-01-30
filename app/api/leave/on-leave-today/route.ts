import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Leave from '@/models/Leave';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Find all approved leave REQUESTS (not allotted leaves) that include today
    // A leave includes today if: startDate <= today AND endDate >= today
    // CRITICAL: 
    // 1. Only include leaves with status exactly 'approved' (exclude 'pending' and 'rejected')
    // 2. Exclude allotted leaves (where allottedBy exists) - these are just balance allocations, not actual leave applications
    // 3. Exclude penalty leaves (leaves deducted for late clock-in)
    const leavesOnLeaveToday = await Leave.find({
      status: 'approved',
      allottedBy: { $exists: false },
      startDate: { $lte: endOfToday },
      endDate: { $gte: today },
      reason: { $not: { $regex: /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct|leave.*deduction/i } },
    })
      .select('userId')
      .lean();

    const userIdsOnLeave = Array.from(
      new Set(leavesOnLeaveToday.map((l: any) => (l.userId?._id || l.userId)?.toString()).filter(Boolean))
    );

    const response = NextResponse.json({ userIdsOnLeave, count: userIdsOnLeave.length });
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error: any) {
    console.error('Get on leave today error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

