import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'admin' && (session.user as any).role !== 'hr') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    await connectDB();

    const updated = await User.findOneAndUpdate(
      {
        _id: id,
        role: { $ne: 'admin' },
        emailVerified: true,
        password: { $exists: true, $ne: null },
      },
      { $set: { approved: true } },
      { new: true, runValidators: true }
    )
      .select('_id name email approved')
      .lean();

    if (!updated) {
      return NextResponse.json(
        { error: 'Employee not found or not eligible for approval' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Employee approved successfully',
      employee: updated,
    });
  } catch (error: any) {
    console.error('Approve employee error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
