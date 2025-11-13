'use client';

import { DollarSign, FileText } from 'lucide-react';
import { format } from 'date-fns';
import UserAvatar from './UserAvatar';

interface Finance {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  bonus?: number;
  totalSalary: number;
  status: 'pending' | 'paid';
  paidAt?: string;
}

interface FinanceManagementProps {
  initialFinances: Finance[];
  canEdit: boolean;
}

export default function FinanceManagement({
  initialFinances,
  canEdit,
}: FinanceManagementProps) {
  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1, 1), 'MMMM');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {initialFinances[0]?.userId && (
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                  Employee
                </th>
              )}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Period
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Base Salary
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Allowances
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Deductions
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Bonus
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Total
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {initialFinances.map((finance) => (
              <tr key={finance._id} className="hover:bg-gray-50">
                {finance.userId && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={finance.userId.name}
                        image={(finance.userId as any)?.profileImage}
                        size="md"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-secondary">
                          {finance.userId.name}
                        </div>
                        <div className="text-xs text-gray-500 font-secondary">{finance.userId.email}</div>
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-secondary">
                    {getMonthName(finance.month)} {finance.year}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-secondary">{formatCurrency(finance.baseSalary)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-green-600 font-secondary">{formatCurrency(finance.allowances)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-red-600 font-secondary">{formatCurrency(finance.deductions)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900 font-secondary">
                    {finance.bonus ? formatCurrency(finance.bonus) : '-'}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-primary font-semibold text-gray-900">
                    {formatCurrency(finance.totalSalary)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full font-secondary ${
                      finance.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {finance.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

