'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, X, Calendar, Clock, Trash2, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';
import LeaveManagement from './LeaveManagement';
import AllottedLeavesList from './AllottedLeavesList';
import DeleteConfirmationModal from './DeleteConfirmationModal';
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
  createdAt: string;
  allottedBy?: {
    _id: string;
    name: string;
  };
}

interface LeaveType {
  _id: string;
  name: string;
  description?: string;
  maxDays?: number;
}

interface LeaveManagementTabsProps {
  initialLeaves: Leave[];
  role: 'admin' | 'hr';
}

export default function LeaveManagementTabs({ initialLeaves, role }: LeaveManagementTabsProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'types' | 'allot'>('requests');
  const [leaves, setLeaves] = useState(initialLeaves);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    leaveType: '',
    days: '',
    carryForward: false,
    reason: '',
  });
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: '',
    maxDays: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; leaveType: LeaveType | null }>({
    isOpen: false,
    leaveType: null,
  });
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLeaveTypes();
    fetchEmployees();
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leave');
      const data = await res.json();
      setLeaves(data.leaves || []);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await fetch('/api/leave-types');
      const data = await res.json();
      setLeaveTypes(data.leaveTypes || []);
    } catch (err) {
      console.error('Error fetching leave types:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setEmployees(data.users?.filter((u: any) => u.role === 'employee') || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleAllotLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/leave/allot', {
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

      toast.success('Leave allotted successfully');
      setShowAllotModal(false);
      setFormData({
        userId: '',
        leaveType: '',
        days: '',
        carryForward: false,
        reason: '',
      });
      fetchLeaves();
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/leave-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeFormData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'An error occurred');
        setLoading(false);
        return;
      }

      toast.success('Leave type added successfully');
      setShowTypeModal(false);
      setTypeFormData({ name: '', description: '', maxDays: '' });
      fetchLeaveTypes();
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleDeleteLeaveTypeClick = (leaveType: LeaveType) => {
    setDeleteModal({ isOpen: true, leaveType });
  };

  const handleDeleteLeaveTypeConfirm = async () => {
    if (!deleteModal.leaveType) return;

    const id = deleteModal.leaveType._id;
    setDeleting(true);

    // Optimistic update - remove immediately from UI
    const previousTypes = [...leaveTypes];
    setLeaveTypes(leaveTypes.filter((type) => type._id !== id));
    toast.success('Leave type deleted successfully');

    try {
      const res = await fetch(`/api/leave-types?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setLeaveTypes(previousTypes);
        toast.error('Failed to delete leave type');
        setDeleting(false);
        setDeleteModal({ isOpen: false, leaveType: null });
        return;
      }
      setDeleting(false);
      setDeleteModal({ isOpen: false, leaveType: null });
    } catch (err) {
      // Revert on error
      setLeaveTypes(previousTypes);
      toast.error('An error occurred');
      setDeleting(false);
      setDeleteModal({ isOpen: false, leaveType: null });
    }
  };

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

  // Filter leaves - show all leave requests (not allotted leaves)
  const leaveRequests = leaves.filter((leave) => !leave.allottedBy);

  return (
    <div>
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'requests'
                ? 'text-primary border-b-2 border-primary bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Leave Requests ({leaveRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('types')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'types'
                ? 'text-primary border-b-2 border-primary bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Leave Types
          </button>
          <button
            onClick={() => setActiveTab('allot')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'allot'
                ? 'text-primary border-b-2 border-primary bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Allot Leave
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && (
        <LeaveManagement
          initialLeaves={leaveRequests}
          canApprove={true}
          onLeaveAdded={fetchLeaves}
          employees={employees}
          leaveTypes={leaveTypes}
        />
      )}

      {activeTab === 'types' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-primary font-semibold text-gray-800">Leave Types</h2>
            <button
              onClick={() => setShowTypeModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="font-secondary">Add Leave Type</span>
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveTypes.map((type) => (
                <div
                  key={type._id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-base font-primary font-semibold text-gray-800 mb-1">
                        {type.name}
                      </h3>
                      {type.description && (
                        <p className="text-sm text-gray-600 font-secondary mb-2">{type.description}</p>
                      )}
                      {type.maxDays && (
                        <p className="text-xs text-gray-500 font-secondary">Max: {type.maxDays} days</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteLeaveTypeClick(type)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'allot' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-primary font-semibold text-gray-800">Allot Leave to Employee</h2>
              <button
                onClick={() => setShowAllotModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="font-secondary">Allot Leave</span>
              </button>
            </div>
          </div>

          {/* Allotted Leaves List */}
          <AllottedLeavesList leaves={leaves} employees={employees} onRefresh={fetchLeaves} />
        </div>
      )}

      {/* Allot Leave Modal */}
      {showAllotModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md"
          >
            <h2 className="text-xl font-primary font-bold text-gray-800 mb-4">Allot Leave</h2>

            <form onSubmit={handleAllotLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Select Employee
                </label>
                <select
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Select Leave Type
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  How Many Days
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="carryForward"
                  checked={formData.carryForward}
                  onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="carryForward" className="text-sm text-gray-700 font-secondary">
                  Carry forward to next year
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Reason (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllotModal(false)}
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
                      <span>Allotting...</span>
                    </>
                  ) : (
                    'Allot Leave'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Leave Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md"
          >
            <h2 className="text-xl font-primary font-bold text-gray-800 mb-4">Add Leave Type</h2>

            <form onSubmit={handleAddLeaveType} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Leave Type Name
                </label>
                <input
                  type="text"
                  value={typeFormData.name}
                  onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                  placeholder="e.g., Annual Leave, Sick Leave"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Description (Optional)
                </label>
                <textarea
                  value={typeFormData.description}
                  onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Max Days (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={typeFormData.maxDays}
                  onChange={(e) => setTypeFormData({ ...typeFormData, maxDays: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
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
                      <span>Adding...</span>
                    </>
                  ) : (
                    'Add Leave Type'
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
        onClose={() => setDeleteModal({ isOpen: false, leaveType: null })}
        onConfirm={handleDeleteLeaveTypeConfirm}
        title="Delete Leave Type"
        message="Are you sure you want to delete this leave type?"
        details={
          deleteModal.leaveType ? (
            <div className="space-y-1">
              <div>
                <span className="font-semibold">Name:</span> {deleteModal.leaveType.name}
              </div>
              {deleteModal.leaveType.description && (
                <div>
                  <span className="font-semibold">Description:</span> {deleteModal.leaveType.description}
                </div>
              )}
              {deleteModal.leaveType.maxDays && (
                <div>
                  <span className="font-semibold">Max Days:</span> {deleteModal.leaveType.maxDays}
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

