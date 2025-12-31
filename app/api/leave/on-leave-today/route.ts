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
      status: 'approved', // Only approved status
      allottedBy: { $exists: false }, // Exclude allotted leaves - only actual leave requests
      startDate: { $lte: endOfToday },
      endDate: { $gte: today },
      reason: { $not: { $regex: /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct|leave.*deduction/i } }, // Exclude penalty-related leaves and deduction history
    })
      .select('userId status startDate endDate allottedBy reason') // Include fields for verification
      .lean();

    // Triple-check: filter out any non-approved leaves, allotted leaves, penalty leaves, and verify dates
    const approvedLeavesOnly = leavesOnLeaveToday.filter((leave: any) => {
      // Ensure status is exactly 'approved' (string comparison)
      if (leave.status !== 'approved') {
        return false;
      }
      
      // Ensure this is NOT an allotted leave (allottedBy should not exist)
      if (leave.allottedBy) {
        return false;
      }
      
      // Exclude penalty-related leaves (leaves deducted for late clock-in penalties)
      if (leave.reason && /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct/i.test(leave.reason)) {
        return false;
      }
      
      // Verify dates are valid and include today
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      
      return startDate <= endOfToday && endDate >= today;
    });

    // Extract unique user IDs from approved leaves only
    const userIdsOnLeave = Array.from(
      new Set(approvedLeavesOnly.map((leave: any) => leave.userId.toString()))
    );

    return NextResponse.json({ 
      userIdsOnLeave,
      count: userIdsOnLeave.length 
    });
  } catch (error: any) {
    console.error('Get on leave today error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

