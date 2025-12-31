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
    const endOfDate = new Date(selectedDate);
    endOfDate.setHours(23, 59, 59, 999);

    // Find all approved leave requests that include the selected date
    // A leave includes the date if: startDate <= date AND endDate >= date
    // Only include leaves with status exactly 'approved' and exclude allotted leaves and penalty leaves
    const leavesOnDate = await Leave.find({
      status: 'approved',
      allottedBy: { $exists: false }, // Exclude allotted leaves - only actual leave requests
      startDate: { $lte: endOfDate },
      endDate: { $gte: selectedDate },
      reason: { $not: { $regex: /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct|leave.*deduction/i } }, // Exclude penalty-related leaves and deduction history
    })
      .select('userId startDate endDate reason')
      .lean();

    // Filter out any penalty leaves that might have passed the regex check
    const approvedLeavesOnly = leavesOnDate.filter((leave: any) => {
      // Exclude penalty-related leaves
      if (leave.reason && /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct/i.test(leave.reason)) {
        return false;
      }
      return true;
    });

    // Extract unique user IDs from approved leaves (excluding penalties)
    const userIdsOnLeave = Array.from(
      new Set(approvedLeavesOnly.map((leave: any) => leave.userId.toString()))
    );

    return NextResponse.json({ 
      userIdsOnLeave,
      count: userIdsOnLeave.length 
    });
  } catch (error: any) {
    console.error('Get employees on leave by date error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

