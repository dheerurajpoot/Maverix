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
    if ((session.user as any).role !== 'employee') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById((session.user as any).id)
      .select('approved emailVerified password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isApproved =
      user.approved === true ||
      (user.approved !== false && !!user.emailVerified && !!user.password);

    return NextResponse.json({ approved: isApproved });
  } catch (error: any) {
    console.error('Check approval error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
