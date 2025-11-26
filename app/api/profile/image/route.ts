import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// Separate endpoint for fetching profileImage only
// This allows lazy loading of images without blocking dashboard loads
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById((session.user as any).id).select('profileImage');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return only the profileImage
    return NextResponse.json({ 
      profileImage: user.profileImage || null 
    });
  } catch (error: any) {
    console.error('Get profile image error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

