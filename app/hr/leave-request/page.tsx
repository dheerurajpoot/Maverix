'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import EmployeeLeaveView from '@/components/EmployeeLeaveView';
import LoadingDots from '@/components/LoadingDots';

export default function HRLeaveRequestPage() {
  const { data: session } = useSession();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      // API already filters by userId for HR role, so we can use leaves directly
      const res = await fetch('/api/leave');
      const data = await res.json();
      if (res.ok) {
        setLeaves(data.leaves || []);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="hr">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-primary font-bold text-gray-800">Leave Request</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">Request and manage your leave</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
            <LoadingDots size="lg" className="mb-3" />
            <p className="text-sm text-gray-500 font-secondary">Loading leave information...</p>
          </div>
        ) : (
          <EmployeeLeaveView initialLeaves={leaves} onLeavesUpdated={fetchLeaves} />
        )}
      </div>
    </DashboardLayout>
  );
}

