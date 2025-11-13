import { getServerSession } from 'next-auth';
import { authOptions } from '../../api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import EmployeeManagement from '@/components/EmployeeManagement';
import UserAvatar from '@/components/UserAvatar';

export default async function HREmployeesPage() {
  const session = await getServerSession(authOptions);

  if (!session || ((session.user as any).role !== 'hr' && (session.user as any).role !== 'admin')) {
    redirect('/login');
  }

  await connectDB();
  const employees = await User.find({ role: { $ne: 'admin' } }).select('-password').lean();

  return (
    <DashboardLayout role="hr">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-primary font-bold text-gray-800">Employees</h1>
            <p className="text-sm text-gray-600 mt-0.5 font-secondary">View all employees</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee: any) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={employee.name}
                          image={employee.profileImage}
                          size="md"
                        />
                        <div className="text-sm font-medium text-gray-900 font-secondary">{employee.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-secondary">{employee.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize font-secondary">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full font-secondary ${
                          employee.emailVerified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {employee.emailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

