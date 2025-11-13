'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Clock, User, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';
import CircleProgress from './CircleProgress';
import LoadingDots from './LoadingDots';

interface Leave {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  leaveType: string | {
    _id: string;
    name: string;
    description?: string;
  };
  startDate: string;
  endDate: string;
  days?: number;
  remainingDays?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  allottedBy?: {
    _id: string;
    name: string;
  };
  carryForward?: boolean;
}

interface EmployeeLeaveViewProps {
  initialLeaves: Leave[];
  onLeavesUpdated?: () => void;
}

export default function EmployeeLeaveView({ initialLeaves, onLeavesUpdated }: EmployeeLeaveViewProps) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const toast = useToast();

  useEffect(() => {
    fetchAllottedLeaveTypes();
  }, []);

  useEffect(() => {
    setLeaves(initialLeaves);
  }, [initialLeaves]);

  const fetchAllottedLeaveTypes = async () => {
    try {
      const res = await fetch('/api/leave/allotted-types');
      const data = await res.json();
      setLeaveTypes(data.leaveTypes || []);
    } catch (err) {
      console.error('Error fetching allotted leave types:', err);
    }
  };

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'An error occurred');
        setLoading(false);
        return;
      }

      toast.success('Leave request submitted successfully');
      setShowRequestModal(false);
      setFormData({ leaveType: '', startDate: '', endDate: '', reason: '' });
      // Refresh leaves
      const leavesRes = await fetch('/api/leave');
      const leavesData = await leavesRes.json();
      setLeaves(leavesData.leaves || []);
      if (onLeavesUpdated) {
        onLeavesUpdated();
      }
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  // Separate allotted leaves and leave requests
  const allottedLeaves = leaves.filter((leave) => leave.allottedBy);
  const leaveRequests = leaves.filter((leave) => !leave.allottedBy);

  return (
    <div className="space-y-6">
      {/* Header with Request Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-primary font-semibold text-gray-800">My Allotted Leaves</h2>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">
            View your allotted leaves and request new ones
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          disabled={leaveTypes.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          <span className="font-secondary">Request Leave</span>
        </button>
      </div>

      {/* Allotted Leaves Cards with Circle Charts */}
      {allottedLeaves.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-secondary">No leaves allotted yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allottedLeaves.map((leave) => {
            const totalDays = leave.days || 0;
            const remainingDays = leave.remainingDays !== undefined ? leave.remainingDays : totalDays;
            const usedDays = totalDays - remainingDays;

            return (
              <motion.div
                key={leave._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Leave Type Name */}
                  <h3 className="text-lg font-primary font-bold text-gray-800 mb-4">
                    {typeof leave.leaveType === 'object' ? leave.leaveType?.name : leave.leaveType}
                  </h3>

                  {/* Circle Progress Chart */}
                  <div className="mb-4">
                    <CircleProgress
                      value={remainingDays}
                      max={totalDays}
                      size={140}
                      strokeWidth={10}
                    />
                  </div>

                  {/* Leave Balance Info */}
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-secondary">Total</span>
                      <span className="font-primary font-semibold text-gray-800">{totalDays} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-secondary">Used</span>
                      <span className="font-primary font-semibold text-red-600">{usedDays} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-700 font-secondary font-medium">Remaining</span>
                      <span className="font-primary font-bold text-primary text-base">{remainingDays} days</span>
                    </div>
                  </div>

                  {/* Carry Forward Indicator */}
                  {leave.carryForward && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-secondary">
                      <CheckCircle className="w-3 h-3" />
                      <span>Carried forward</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Leave Request History */}
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-primary font-semibold text-gray-800">Leave Request History</h2>
          <p className="text-sm text-gray-600 mt-0.5 font-secondary">
            Track all your leave requests and their approval status
          </p>
        </div>

        {leaveRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-secondary">No leave requests yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Leave Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Days
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Dates
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Reason
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Status
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                      Requested On
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaveRequests.map((leave) => (
                    <motion.tr
                      key={leave._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize font-secondary">
                          {typeof leave.leaveType === 'object' ? leave.leaveType?.name : leave.leaveType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-secondary">
                          {leave.days || 'N/A'} {leave.days === 1 ? 'day' : 'days'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-secondary">
                          {format(new Date(leave.startDate), 'MMM dd, yyyy')} -{' '}
                          {format(new Date(leave.endDate), 'MMM dd, yyyy')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 max-w-xs truncate font-secondary">{leave.reason}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full font-secondary ${getStatusColor(
                            leave.status
                          )}`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-secondary">
                          {format(new Date(leave.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Request Leave Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md"
          >
            <h2 className="text-xl font-primary font-bold text-gray-800 mb-4">Request Leave</h2>

            <form onSubmit={handleRequestLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Leave Type
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                  disabled={leaveTypes.length === 0}
                >
                  <option value="">
                    {leaveTypes.length === 0 ? 'No allotted leave types available' : 'Select Leave Type'}
                  </option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {leaveTypes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1 font-secondary">
                    You need to have leaves allotted by admin/HR before you can request leave
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 font-secondary flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoadingDots size="sm" color="white" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

