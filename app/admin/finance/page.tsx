import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import connectDB from '@/lib/mongodb';
import Finance from '@/models/Finance';
import User from '@/models/User';
import FinanceManagement from '@/components/FinanceManagement';

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    redirect('/login');
  }

  await connectDB();
  const finances = await Finance.find()
    .populate('userId', 'name email')
    .sort({ year: -1, month: -1 })
    .lean();

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-primary font-bold text-gray-800">Finance Management</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">Manage payroll and employee finances</p>
        </div>

        <FinanceManagement
          initialFinances={JSON.parse(JSON.stringify(finances))}
          canEdit={true}
        />
      </div>
    </DashboardLayout>
  );
}

