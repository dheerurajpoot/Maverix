import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, role, designation, weeklyOff } = body;

    // Debug logging
    console.log('[Update User] Request body:', JSON.stringify(body));
    console.log('[Update User] weeklyOff received:', weeklyOff);

    await connectDB();

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent HR from changing user roles
    if (userRole === 'hr' && role && role !== user.role) {
      return NextResponse.json({ error: 'HR cannot change user roles' }, { status: 403 });
    }

    if (name) user.name = name;
    // Only allow role change if user is admin
    if (role && userRole === 'admin') {
      user.role = role;
    }
    if (designation !== undefined) {
      user.designation = designation && designation.trim() !== '' ? designation.trim() : undefined;
    }
    
    // Always update weeklyOff - it should always be in the request body
    // Process weeklyOff regardless of whether it's provided or not
    const filteredWeeklyOff = weeklyOff !== undefined && Array.isArray(weeklyOff)
      ? weeklyOff.filter(day => day && typeof day === 'string' && day.trim())
      : (weeklyOff === undefined ? (user.weeklyOff || []) : []);
    
    user.weeklyOff = filteredWeeklyOff;
    user.markModified('weeklyOff'); // Explicitly mark as modified for Mongoose
    
    console.log('[Update User] weeklyOff received:', weeklyOff);
    console.log('[Update User] weeklyOff filtered:', filteredWeeklyOff);
    console.log('[Update User] User weeklyOff before save:', user.weeklyOff);

    const saveResult = await user.save();
    console.log('[Update User] Save result weeklyOff:', saveResult.weeklyOff);
    
    // Reload user to ensure all fields are properly saved
    const updatedUser = await User.findById(params.id)
      .select('_id name email role designation profileImage mobileNumber emailVerified approved weeklyOff createdAt updatedAt')
      .lean();

    console.log('[Update User] Updated user weeklyOff from DB:', updatedUser?.weeklyOff);
    console.log('[Update User] Updated user weeklyOff type:', typeof updatedUser?.weeklyOff);
    console.log('[Update User] Updated user weeklyOff isArray:', Array.isArray(updatedUser?.weeklyOff));
    console.log('[Update User] Updated user (full):', JSON.stringify(updatedUser, null, 2));

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(params.id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin user' }, { status: 400 });
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

