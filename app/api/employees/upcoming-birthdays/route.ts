import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 10;

function getNextThreeMonths1Based(): number[] {
  const now = new Date();
  const current = now.getMonth() + 1; // 1–12
  return [current, (current % 12) + 1, ((current + 1) % 12) + 1];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const monthsToInclude = getNextThreeMonths1Based();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const showAll = request.nextUrl.searchParams.get('all') === 'true';

    const employees = await User.find({
      dateOfBirth: { $exists: true, $ne: null },
      $expr: { $in: [{ $month: '$dateOfBirth' }, monthsToInclude] },
    })
      .select('_id name email profileImage dateOfBirth designation')
      .lean();

    type EmpLean = { dateOfBirth?: Date; _id: unknown; name: string; email: string; profileImage?: string; designation?: string };
    const upcomingBirthdays = (employees as EmpLean[])
      .map((emp) => {
        const dob = new Date(emp.dateOfBirth!);
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
          _id: String(emp._id),
          name: emp.name,
          email: emp.email,
          profileImage: emp.profileImage,
          dateOfBirth: dateStr,
          designation: emp.designation,
          daysUntil,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);

    const result = showAll ? upcomingBirthdays : upcomingBirthdays.slice(0, DEFAULT_LIMIT);

    const res = NextResponse.json({ birthdays: result });
    res.headers.set('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
    return res;
  } catch (error: unknown) {
    console.error('Upcoming birthdays error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
