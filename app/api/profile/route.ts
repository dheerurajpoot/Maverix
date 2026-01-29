import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { generateEmployeeId, extractEmployeeIdSequence } from '@/utils/generateEmployeeId';

export const dynamic = 'force-dynamic';

// GET - Fetch user profile (excludes password)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById((session.user as any).id)
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      mobileNumber,
      dateOfBirth,
      joiningYear,
      profileImage,
      currentPassword,
      newPassword,
      bankName,
      accountNumber,
      ifscCode,
      location,
      panNumber,
      aadharNumber,
    } = body;

    await connectDB();

    const userId = (session.user as any).id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousJoiningYear = user.joiningYear ?? null;
    const isClearingJoiningYear =
      joiningYear === null || joiningYear === '' || (typeof joiningYear === 'string' && joiningYear.trim() === '');

    const updateFields: any = {};

    // Update name
    if (name) {
      updateFields.name = name;
    }

    // Update mobile number
    if (mobileNumber !== undefined) {
      updateFields.mobileNumber = mobileNumber || null;
    }

    // Update date of birth
    if (dateOfBirth !== undefined) {
      if (dateOfBirth && typeof dateOfBirth === 'string' && dateOfBirth.trim() !== '') {
        try {
          const [year, month, day] = dateOfBirth.split('-').map(Number);
          const dobDate = new Date(Date.UTC(year, month - 1, day));
          if (!isNaN(dobDate.getTime())) {
            updateFields.dateOfBirth = dobDate;
          } else {
            updateFields.dateOfBirth = null;
          }
        } catch (error) {
          updateFields.dateOfBirth = null;
        }
      } else {
        updateFields.dateOfBirth = null;
      }
    }

    // Update joining year
    if (joiningYear !== undefined) {
      if (isClearingJoiningYear) {
        // Will be unset below
      } else {
        const yearNum = typeof joiningYear === 'string' ? parseInt(joiningYear, 10) : joiningYear;
        if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= 2100) {
          updateFields.joiningYear = yearNum;
          if (!previousJoiningYear) {
            updateFields.joiningYearUpdatedAt = new Date();
          }
        }
      }
    }

    // Update profile image
    if (profileImage !== undefined) {
      updateFields.profileImage = profileImage;
    }

    // Update bank details
    if (bankName !== undefined) {
      updateFields.bankName = bankName && bankName.trim() !== '' ? bankName.trim() : null;
    }
    if (accountNumber !== undefined) {
      updateFields.accountNumber = accountNumber && accountNumber.trim() !== '' ? accountNumber.trim() : null;
    }
    if (ifscCode !== undefined) {
      updateFields.ifscCode = ifscCode && ifscCode.trim() !== '' ? ifscCode.toUpperCase().trim() : null;
    }

    // Update location
    if (location !== undefined) {
      updateFields.location = location && location.trim() !== '' ? location.trim() : null;
    }

    // Update PAN number
    if (panNumber !== undefined) {
      updateFields.panNumber = panNumber && panNumber.trim() !== '' ? panNumber.toUpperCase().trim() : null;
    }

    // Update Aadhar number
    if (aadharNumber !== undefined) {
      updateFields.aadharNumber = aadharNumber && aadharNumber.trim() !== '' ? aadharNumber.trim() : null;
    }

    // Update password
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      updateFields.password = await bcrypt.hash(newPassword, 10);
    }

    // Check if there are fields to update
    if (Object.keys(updateFields).length === 0 && joiningYear === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Build update operation
    const updateOp: any = { $set: updateFields };
    if (isClearingJoiningYear) {
      updateOp.$unset = { joiningYear: '', joiningYearUpdatedAt: '', empId: '' };
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateOp, {
      new: true,
      runValidators: true,
    });

    // Handle employee ID generation
    if (updatedUser?.joiningYear) {
      const currentEmpId = updatedUser.empId;
      if (!currentEmpId) {
        const empId = await generateEmployeeId(updatedUser.joiningYear);
        await User.findByIdAndUpdate(userId, { $set: { empId } });
      } else {
        const seq = extractEmployeeIdSequence(currentEmpId);
        const expectedPrefix = `${updatedUser.joiningYear}EMP-`;
        if (seq !== null && !currentEmpId.startsWith(expectedPrefix)) {
          const newEmpId = `${updatedUser.joiningYear}EMP-${String(seq).padStart(3, '0')}`;
          await User.findByIdAndUpdate(userId, { $set: { empId: newEmpId } });
        }
      }
    }

    // Fetch updated user without password
    const userResponse = await User.findById(userId).select('-password').lean();

    if (!userResponse) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: userResponse,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
