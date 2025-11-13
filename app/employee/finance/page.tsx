'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import FinanceManagement from '@/components/FinanceManagement';
import LoadingDots from '@/components/LoadingDots';

export default function EmployeeFinancePage() {
  const { data: session } = useSession();
  const [finances, setFinances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinances();
  }, []);

  const fetchFinances = async () => {
    try {
      const res = await fetch('/api/finance');
      const data = await res.json();
      setFinances(data.finances || []);
    } catch (err) {
      console.error('Error fetching finances:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="employee">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-primary font-bold text-gray-800">Salary Slips</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">View your salary information and payslips</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
            <LoadingDots size="lg" className="mb-3" />
            <p className="text-sm text-gray-500 font-secondary">Loading finance data...</p>
          </div>
        ) : (
          <FinanceManagement initialFinances={finances} canEdit={false} />
        )}
      </div>
    </DashboardLayout>
  );
}

