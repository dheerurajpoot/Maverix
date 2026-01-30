import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const employees = await User.find({
      role: { $ne: 'admin' },
      emailVerified: true,
      password: { $exists: true, $ne: null },
      approved: { $ne: true },
    })
      .select('_id name email role designation profileImage emailVerified createdAt approved')
      .sort({ createdAt: -1 })
      .lean();

    const res = NextResponse.json({ employees });
    res.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120');
    return res;
  } catch (error: any) {
    console.error('Pending employees error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
