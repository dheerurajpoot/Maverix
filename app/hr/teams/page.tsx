import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import TeamManagement from '@/components/TeamManagement';
import Team from '@/models/Team';

// Ensure Team model is registered
const _ = Team;

export default async function HRTeamsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'hr') {
    redirect('/login');
  }

  return (
    <DashboardLayout role="hr">
      <div className="p-4 md:p-6">
        <TeamManagement />
      </div>
    </DashboardLayout>
  );
}

