import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Profile from '@/components/Profile';

export default async function HRProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'hr') {
    redirect('/login');
  }

  return (
    <DashboardLayout role="hr">
      <div className="p-4 md:p-6">
        <Profile />
      </div>
    </DashboardLayout>
  );
}

