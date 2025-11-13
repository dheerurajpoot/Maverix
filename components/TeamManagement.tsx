'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Users, UserCheck, Search, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import UserAvatar from './UserAvatar';
import LoadingDots from './LoadingDots';

interface Employee {
  _id: string;
  name: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  leader: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    _id: string;
    name: string;
    email: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; team: Team | null }>({
    isOpen: false,
    team: null,
  });
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leader: '',
    members: [] as string[],
  });
  const toast = useToast();

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams);
      } else {
        toast.error(data.error || 'Failed to fetch teams');
      }
    } catch (err: any) {
      toast.error('An error occurred');
    }
  }, [toast]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.users || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
    fetchEmployees();
  }, [fetchTeams, fetchEmployees]);

  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || '',
        leader: team.leader._id,
        members: team.members
          .filter((member) => member._id !== team.leader._id)
          .map((member) => member._id),
      });
    } else {
      setEditingTeam(null);
      setFormData({
        name: '',
        description: '',
        leader: '',
        members: [],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeam(null);
    setFormData({
      name: '',
      description: '',
      leader: '',
      members: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingTeam ? `/api/teams/${editingTeam._id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save team');
        setLoading(false);
        return;
      }

      toast.success(editingTeam ? 'Team updated successfully' : 'Team created successfully');
      handleCloseModal();
      fetchTeams();
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleDeleteClick = (team: Team) => {
    setDeleteModal({ isOpen: true, team });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.team) return;

    const id = deleteModal.team._id;
    setDeleting(true);

    // Optimistic update
    const previousTeams = [...teams];
    setTeams(teams.filter((team) => team._id !== id));
    toast.success('Team deleted successfully');

    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        // Revert on error
        setTeams(previousTeams);
        toast.error('Failed to delete team');
        setDeleting(false);
        setDeleteModal({ isOpen: false, team: null });
        return;
      }

      setDeleting(false);
      setDeleteModal({ isOpen: false, team: null });
    } catch (err) {
      // Revert on error
      setTeams(previousTeams);
      toast.error('An error occurred');
      setDeleting(false);
      setDeleteModal({ isOpen: false, team: null });
    }
  };

  const toggleMember = (employeeId: string) => {
    if (formData.members.includes(employeeId)) {
      setFormData({
        ...formData,
        members: formData.members.filter((id) => id !== employeeId),
      });
    } else {
      setFormData({
        ...formData,
        members: [...formData.members, employeeId],
      });
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.leader.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-primary font-semibold text-gray-800">Team Management</h2>
            <p className="text-sm text-gray-600 mt-0.5 font-secondary">
              Create and manage teams with assigned leaders
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="font-secondary">Create Team</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search teams by name, leader, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
          />
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-secondary">
            {searchTerm ? 'No teams found matching your search' : 'No teams created yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <motion.div
              key={team._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-primary font-semibold text-gray-800 mb-1">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 font-secondary mb-3">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(team)}
                    className="text-primary hover:text-primary-dark p-1.5 rounded hover:bg-primary-50 transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(team)}
                    className="text-red-600 hover:text-red-900 p-1.5 rounded hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="font-medium text-gray-700 font-secondary">Leader:</span>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={team.leader.name}
                      image={(team.leader as any)?.profileImage}
                      size="sm"
                    />
                    <span className="text-gray-900 font-secondary">{team.leader.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700 font-secondary">Members:</span>
                  <span className="text-gray-900 font-secondary">
                    {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>

              {/* Members List */}
              {team.members.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2 font-secondary">Team Members:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.slice(0, 5).map((member) => (
                      <span
                        key={member._id}
                        className={`text-xs px-2 py-1 rounded-full font-secondary ${
                          member._id === team.leader._id
                            ? 'bg-primary-100 text-primary font-semibold'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {member.name}
                        {member._id === team.leader._id && ' (Leader)'}
                      </span>
                    ))}
                    {team.members.length > 5 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 font-secondary">
                        +{team.members.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-primary font-bold text-gray-800">
                {editingTeam ? 'Edit Team' : 'Create Team'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                  placeholder="Enter team name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                  placeholder="Enter team description (optional)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Team Leader *
                </label>
                <select
                  value={formData.leader}
                  onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-secondary bg-white"
                >
                  <option value="">Select Team Leader</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5 font-secondary">
                  Team Members
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                  {employees.length === 0 ? (
                    <p className="text-sm text-gray-500 font-secondary">No employees available</p>
                  ) : (
                    <div className="space-y-2">
                      {employees.map((emp) => {
                        const isSelected = formData.members.includes(emp._id);
                        const isLeader = formData.leader === emp._id;
                        return (
                          <label
                            key={emp._id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                              isLeader
                                ? 'bg-primary-50 border border-primary-200'
                                : isSelected
                                ? 'bg-primary-50 border border-primary-200'
                                : 'bg-white border border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected || isLeader}
                              onChange={() => !isLeader && toggleMember(emp._id)}
                              disabled={isLeader}
                              className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                            />
                            <span className="text-sm text-gray-700 font-secondary flex-1">
                              {emp.name}
                              {isLeader && (
                                <span className="ml-2 text-xs text-primary font-semibold">(Leader)</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 font-secondary">
                  Note: The team leader is automatically included as a member
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 font-secondary flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoadingDots size="sm" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    editingTeam ? 'Update Team' : 'Create Team'
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
        onClose={() => setDeleteModal({ isOpen: false, team: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Team"
        message="Are you sure you want to delete this team?"
        details={
          deleteModal.team ? (
            <div className="space-y-1">
              <div>
                <span className="font-semibold">Team Name:</span> {deleteModal.team.name}
              </div>
              {deleteModal.team.description && (
                <div>
                  <span className="font-semibold">Description:</span> {deleteModal.team.description}
                </div>
              )}
              <div>
                <span className="font-semibold">Leader:</span> {deleteModal.team.leader.name}
              </div>
              <div>
                <span className="font-semibold">Members:</span> {deleteModal.team.members.length}
              </div>
            </div>
          ) : null
        }
        loading={deleting}
      />
    </div>
  );
}

