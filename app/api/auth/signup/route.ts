import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendVerificationEmail } from '@/utils/sendEmail';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      } else {
        // Resend verification email
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        existingUser.verificationToken = verificationToken;
        existingUser.verificationTokenExpiry = verificationTokenExpiry;
        await existingUser.save();

        await sendVerificationEmail(existingUser.email, verificationToken);

        return NextResponse.json({
          message: 'Verification email sent. Please check your inbox.',
        });
      }
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = new User({
      email: email.toLowerCase(),
      name,
      verificationToken,
      verificationTokenExpiry,
      emailVerified: false,
    });

    await user.save();

    await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json({
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

