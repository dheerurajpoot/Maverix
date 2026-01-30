import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendVerificationEmail } from '@/utils/sendEmail';
import crypto from 'crypto';
import { ensureEmpIdsByJoiningYear } from '@/lib/ensureEmpIdsByJoiningYear';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    const minimal = request.nextUrl.searchParams.get('minimal') === 'true';

    if (!minimal) {
      await ensureEmpIdsByJoiningYear();
    }

    const users = await User.find({ role: { $ne: 'admin' } })
      .select(
        minimal
          ? '_id name email role profileImage'
          : '_id name email role empId designation profileImage mobileNumber joiningYear joiningYearUpdatedAt emailVerified approved weeklyOff clockInTime createdAt bankName accountNumber ifscCode panCardImage aadharCardImage location panNumber aadharNumber'
      )
      .sort({ name: 1 })
      .lean();

    const sanitizedUsers = minimal
      ? users
      : (users as any[]).map((u) => {
          const validYear = typeof u.joiningYear === 'number' && u.joiningYear >= 1900 && u.joiningYear <= 2100;
          return validYear ? u : { ...u, empId: undefined, joiningYearUpdatedAt: undefined };
        });

    const response = NextResponse.json({ users: sanitizedUsers });
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'hr') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, role, designation, weeklyOff, clockInTime } = await request.json();

    if (!email?.trim() || !name?.trim()) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    const finalRole = userRole === 'hr' ? 'employee' : (role || 'employee');
    if (userRole === 'hr' && (finalRole === 'admin' || finalRole === 'hr')) {
      return NextResponse.json({ error: 'HR cannot create admin or HR users' }, { status: 403 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const approved = finalRole === 'admin' || finalRole === 'hr';

    let finalClockInTime: string | undefined;
    if (clockInTime != null && String(clockInTime).trim() !== '') {
      const trimmed = String(clockInTime).trim();
      if (trimmed === 'N/R') {
        finalClockInTime = 'N/R';
      } else if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(trimmed)) {
        return NextResponse.json(
          { error: 'Invalid clock-in time format. Use HH:mm (e.g. 09:30)' },
          { status: 400 }
        );
      } else {
        finalClockInTime = trimmed;
      }
    }

    const user = new User({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role: finalRole,
      designation: designation?.trim() || undefined,
      weeklyOff: Array.isArray(weeklyOff) ? weeklyOff.filter((d) => d && String(d).trim()) : [],
      clockInTime: finalClockInTime,
      verificationToken,
      verificationTokenExpiry,
      emailVerified: false,
      approved,
    });

    await user.save();

    await sendVerificationEmail(user.email, verificationToken, user.name);

    return NextResponse.json({
      message: 'User created successfully. Verification email sent.',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        designation: user.designation,
        emailVerified: user.emailVerified,
        weeklyOff: user.weeklyOff ?? [],
        clockInTime: user.clockInTime,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

