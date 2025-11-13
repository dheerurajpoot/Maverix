'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Calendar, User, Clock, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import UserAvatar from './UserAvatar';
import LoadingDots from './LoadingDots';

interface Leave {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  leaveType: {
    _id: string;
    name: string;
    description?: string;
  };
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  allottedBy?: {
    _id: string;
    name: string;
  };
  carryForward?: boolean;
}

interface AllottedLeavesListProps {
  leaves: Leave[];
  employees: any[];
  onRefresh?: () => void;
}

export default function AllottedLeavesList({ leaves, employees, onRefresh }: AllottedLeavesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null);
  const [editFormData, setEditFormData] = useState({
    days: '',
    startDate: '',
    endDate: '',
    reason: '',
    carryForward: false,
    leaveType: '',
  });
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; leave: Leave | null }>({
    isOpen: false,
    leave: null,
  });
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // Fetch leave types on mount
  useEffect(() => {
    fetch('/api/leave-types')
      .then((res) => res.json())
      .then((data) => setLeaveTypes(data.leaveTypes || []))
      .catch((err) => console.error('Error fetching leave types:', err));
  }, []);

  // Filter allotted leaves (only leaves that were allotted)
  const allottedLeaves = useMemo(() => {
    return leaves.filter((leave) => leave.allottedBy);
  }, [leaves]);

  // Apply search and filters
  const filteredLeaves = useMemo(() => {
    return allottedLeaves.filter((leave) => {
      const matchesSearch =
        leave.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof leave.leaveType === 'object' ? leave.leaveType?.name : leave.leaveType)
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesEmployee = !filterEmployee || leave.userId?._id === filterEmployee;
      const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;

      return matchesSearch && matchesEmployee && matchesStatus;
    });
  }, [allottedLeaves, searchTerm, filterEmployee, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleDeleteClick = (leave: Leave) => {
    setDeleteModal({ isOpen: true, leave });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.leave) return;

    const id = deleteModal.leave._id;
    setDeleting(true);

    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete leave');
        setDeleting(false);
        setDeleteModal({ isOpen: false, leave: null });
        return;
      }

      toast.success('Leave deleted successfully');
      setDeleting(false);
      setDeleteModal({ isOpen: false, leave: null });
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      toast.error('An error occurred');
      setDeleting(false);
      setDeleteModal({ isOpen: false, leave: null });
    }
  };

  const handleEdit = (leave: Leave) => {
    setEditingLeave(leave);
    setEditFormData({
      days: leave.days?.toString() || '',
      startDate: format(new Date(leave.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(leave.endDate), 'yyyy-MM-dd'),
      reason: leave.reason || '',
      carryForward: leave.carryForward || false,
      leaveType: typeof leave.leaveType === 'object' ? leave.leaveType._id : leave.leaveType,
    });
  };

  const handleUpdateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeave) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/leave/${editingLeave._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to update leave');
        setLoading(false);
        return;
      }

      toast.success('Leave updated successfully');
      setEditingLeave(null);
      if (onRefresh) {
        onRefresh();
      }
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-primary font-semibold text-gray-800 mb-4">Allotted Leaves</h2>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by employee or leave type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white appearance-none"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leaves List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Employee
              </th>
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
                Allotted By
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase font-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredLeaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 font-secondary">
                  No allotted leaves found
                </td>
              </tr>
            ) : (
              filteredLeaves.map((leave) => (
                <motion.tr
                  key={leave._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={leave.userId?.name}
                        image={(leave.userId as any)?.profileImage}
                        size="md"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-secondary">
                          {leave.userId?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 font-secondary">{leave.userId?.email || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
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
                    {leave.carryForward && (
                      <div className="text-xs text-primary mt-1 font-secondary">Carried Forward</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-secondary">
                      {leave.allottedBy?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(leave)}
                        className="p-1.5 text-primary hover:bg-primary-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(leave)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md"
          >
            <h2 className="text-xl font-primary font-bold text-gray-800 mb-4">Edit Allotted Leave</h2>

            <form onSubmit={handleUpdateLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Leave Type
                </label>
                <select
                  value={editFormData.leaveType}
                  onChange={(e) => setEditFormData({ ...editFormData, leaveType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                >
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Days
                </label>
                <input
                  type="number"
                  value={editFormData.days}
                  onChange={(e) => setEditFormData({ ...editFormData, days: e.target.value })}
                  required
                  min="1"
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editFormData.startDate}
                  onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  End Date
                </label>
                <input
                  type="date"
                  value={editFormData.endDate}
                  onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Reason
                </label>
                <textarea
                  value={editFormData.reason}
                  onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="carryForwardEdit"
                  type="checkbox"
                  checked={editFormData.carryForward}
                  onChange={(e) => setEditFormData({ ...editFormData, carryForward: e.target.checked })}
                  className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label htmlFor="carryForwardEdit" className="text-sm font-medium text-gray-700 font-secondary">
                  Carry forward to next year
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLeave(null)}
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
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Leave'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, leave: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Allotted Leave"
        message="Are you sure you want to delete this allotted leave?"
        details={
          deleteModal.leave ? (
            <div className="space-y-1">
              <div>
                <span className="font-semibold">Employee:</span>{' '}
                {deleteModal.leave.userId?.name || 'N/A'} ({deleteModal.leave.userId?.email || 'N/A'})
              </div>
              <div>
                <span className="font-semibold">Leave Type:</span>{' '}
                {typeof deleteModal.leave.leaveType === 'object'
                  ? deleteModal.leave.leaveType?.name
                  : deleteModal.leave.leaveType}
              </div>
              <div>
                <span className="font-semibold">Days:</span> {deleteModal.leave.days || 'N/A'}
              </div>
              <div>
                <span className="font-semibold">Dates:</span>{' '}
                {format(new Date(deleteModal.leave.startDate), 'MMM dd, yyyy')} -{' '}
                {format(new Date(deleteModal.leave.endDate), 'MMM dd, yyyy')}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> {deleteModal.leave.reason || 'N/A'}
              </div>
              {deleteModal.leave.carryForward && (
                <div>
                  <span className="font-semibold">Carry Forward:</span> Yes
                </div>
              )}
            </div>
          ) : null
        }
        loading={deleting}
      />
    </div>
  );
}

