import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    if (q.length < 2) {
      return NextResponse.json({ employees: [] });
    }

    await connectDB();

    const regex = new RegExp(q, 'i');
    const employees = await User.find({
      role: 'employee',
      $or: [
        { name: regex },
        { email: regex },
        { mobileNumber: regex },
        { empId: regex },
      ],
    })
      .select('_id name email mobileNumber profileImage role dateOfBirth designation empId')
      .limit(20)
      .lean();

    const res = NextResponse.json({ employees });
    res.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=30');
    return res;
  } catch (error: any) {
    console.error('Employee search error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
