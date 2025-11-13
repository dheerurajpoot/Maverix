'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import AttendanceManagement from '@/components/AttendanceManagement';
import LoadingDots from '@/components/LoadingDots';

export default function EmployeeAttendancePage() {
  const { data: session } = useSession();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      setAttendance(data.attendance || []);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="employee">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-primary font-bold text-gray-800">My Attendance</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">View your attendance history</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center">
            <LoadingDots size="lg" className="mb-3" />
            <p className="text-sm text-gray-500 font-secondary">Loading attendance data...</p>
          </div>
        ) : (
          <AttendanceManagement initialAttendance={attendance} />
        )}
      </div>
    </DashboardLayout>
  );
}

