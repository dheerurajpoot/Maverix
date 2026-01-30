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

    await connectDB();

    const employees = await User.find({
      dateOfBirth: { $exists: true, $ne: null },
    })
      .select('_id name email profileImage dateOfBirth role designation')
      .lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const getAllBirthdays = request.nextUrl.searchParams.get('all') === 'true';

    const upcomingBirthdays = employees
      .filter((emp: any) => emp.dateOfBirth)
      .map((emp: any) => {
        const dob = new Date(emp.dateOfBirth);
        const birthMonth = dob.getMonth();
        const birthDay = dob.getDate();
        let nextBirthday = new Date(currentYear, birthMonth, birthDay);
        nextBirthday.setHours(0, 0, 0, 0);
        if (nextBirthday < today) {
          nextBirthday = new Date(currentYear + 1, birthMonth, birthDay);
          nextBirthday.setHours(0, 0, 0, 0);
        }
        const daysUntil = Math.floor((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const dateStr = emp.dateOfBirth instanceof Date
          ? emp.dateOfBirth.toISOString().split('T')[0]
          : String(emp.dateOfBirth).split('T')[0];
        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          profileImage: emp.profileImage,
          dateOfBirth: dateStr,
          designation: emp.designation,
          daysUntil,
        };
      })
      .sort((a: any, b: any) => {
        if (getAllBirthdays) {
          const aM = new Date(a.dateOfBirth).getMonth();
          const bM = new Date(b.dateOfBirth).getMonth();
          if (aM !== bM) return aM - bM;
          return new Date(a.dateOfBirth).getDate() - new Date(b.dateOfBirth).getDate();
        }
        return a.daysUntil - b.daysUntil;
      });

    const result = getAllBirthdays ? upcomingBirthdays : upcomingBirthdays.slice(0, 10);

    const res = NextResponse.json({ birthdays: result });
    res.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (error: any) {
    console.error('Upcoming birthdays error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
