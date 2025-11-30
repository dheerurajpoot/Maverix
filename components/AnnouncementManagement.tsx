'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, X, Send, Megaphone, Edit2, Trash2, BarChart3, PlusCircle, Trash2 as TrashIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';
import { useSession } from 'next-auth/react';
import UserAvatar from './UserAvatar';
import LoadingDots from './LoadingDots';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface Announcement {
  _id: string;
  title: string;
  content: string;
  date: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    profileImage?: string;
    role: string;
  };
  createdAt: string;
  views?: Array<{
    userId: string;
    viewCount: number;
  }>;
  poll?: {
    question: string;
    options: Array<{
      text: string;
      votes: Array<{
        userId: string;
        votedAt: string;
      }>;
    }>;
    createdAt: string;
  };
}

export default function AnnouncementManagement() {
  const { data: session } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; announcement: Announcement | null }>({
    isOpen: false,
    announcement: null,
  });
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    hasPoll: false,
    pollQuestion: '',
    pollOptions: ['', ''],
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPollResponses, setShowPollResponses] = useState<Announcement | null>(null);
  const toast = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get today's date in YYYY-MM-DD format for min date
  const getTodayDate = () => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      setFetching(true);
      const res = await fetch('/api/announcements');
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
      } else {
        toast.error(data.error || 'Failed to fetch announcements');
      }
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      toast.error('Failed to load announcements');
    } finally {
      setFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate poll if enabled
    if (formData.hasPoll) {
      if (!formData.pollQuestion.trim()) {
        setError('Poll question is required');
        setLoading(false);
        return;
      }
      const validOptions = formData.pollOptions.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        setError('Poll must have at least 2 options');
        setLoading(false);
        return;
      }
    }

    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement._id}`
        : '/api/announcements';
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const payload: any = {
        title: formData.title,
        content: formData.content,
        date: formData.date,
      };

      // Always include poll field when editing to ensure it can be removed
      if (editingAnnouncement) {
        if (formData.hasPoll) {
          payload.poll = {
            question: formData.pollQuestion.trim(),
            options: formData.pollOptions.filter(opt => opt.trim()).map(opt => ({ text: opt.trim() })),
          };
        } else {
          // If editing and poll checkbox is unchecked, explicitly remove the poll
          payload.poll = null;
        }
      } else if (formData.hasPoll) {
        // Only include poll when creating new announcement if checkbox is checked
        payload.poll = {
          question: formData.pollQuestion.trim(),
          options: formData.pollOptions.filter(opt => opt.trim()).map(opt => ({ text: opt.trim() })),
        };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          editingAnnouncement
            ? 'Announcement updated successfully!'
            : 'Announcement created successfully!'
        );
        setFormData({
          title: '',
          content: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          hasPoll: false,
          pollQuestion: '',
          pollOptions: ['', ''],
        });
        setShowModal(false);
        setEditingAnnouncement(null);
        fetchAnnouncements();
      } else {
        setError(data.error || `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
        toast.error(data.error || `Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
      }
    } catch (err: any) {
      console.error(`Error ${editingAnnouncement ? 'updating' : 'creating'} announcement:`, err);
      setError(`Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
      toast.error(`Failed to ${editingAnnouncement ? 'update' : 'create'} announcement`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      date: format(new Date(announcement.date), 'yyyy-MM-dd'),
      hasPoll: false, // Always start unchecked - user must explicitly select
      pollQuestion: announcement.poll?.question || '',
      pollOptions: announcement.poll?.options.map(opt => opt.text) || ['', ''],
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.announcement) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteModal.announcement._id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Announcement deleted successfully!');
        setDeleteModal({ isOpen: false, announcement: null });
        fetchAnnouncements();
      } else {
        toast.error(data.error || 'Failed to delete announcement');
      }
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      toast.error('Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
        setFormData({
          title: '',
          content: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          hasPoll: false,
          pollQuestion: '',
          pollOptions: ['', ''],
        });
    setError('');
  };

  const getTotalViews = (announcement: Announcement) => {
    if (!announcement.views || announcement.views.length === 0) return 0;
    return announcement.views.reduce((sum, view) => sum + (view.viewCount || 0), 0);
  };

  const getUniqueViewers = (announcement: Announcement) => {
    if (!announcement.views) return 0;
    return announcement.views.length;
  };

  const canEditOrDelete = (announcement: Announcement) => {
    const currentUserId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;
    // Admin can edit/delete any, others can only edit/delete their own
    return (
      userRole === 'admin' ||
      announcement.createdBy._id === currentUserId
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-primary font-bold text-gray-800">Announcements</h2>
            <p className="text-sm text-gray-600 font-secondary">Manage and create announcements for employees</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({
              title: '',
              content: '',
              date: format(new Date(), 'yyyy-MM-dd'),
              hasPoll: false,
              pollQuestion: '',
              pollOptions: ['', ''],
            });
            setError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow font-secondary font-semibold"
        >
          <Plus className="w-5 h-5" />
          Create Announcement
        </motion.button>
      </div>

      {/* Announcements List */}
      {fetching ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 flex flex-col items-center justify-center border border-white/50 ">
          <LoadingDots size="lg" className="mb-3" />
          <p className="text-sm text-gray-500 font-secondary">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-12 flex flex-col items-center justify-center border border-white/50">
          <Megaphone className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-lg font-primary font-semibold text-gray-600 mb-2">No announcements yet</p>
          <p className="text-sm text-gray-500 font-secondary">Create your first announcement to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {announcements.map((announcement, index) => (
            <motion.div
              key={announcement._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className=" bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow h-full flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <UserAvatar
                    name={announcement.createdBy.name}
                    image={announcement.createdBy.profileImage}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-primary font-semibold text-gray-800">
                      {announcement.createdBy.name}
                    </p>
                    <p className="text-xs text-gray-500 font-secondary capitalize">
                      {announcement.createdBy.role}
                    </p>
                  </div>
                </div>
                {canEditOrDelete(announcement) && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit announcement"
                    >
                      <Edit2 className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteModal({ isOpen: true, announcement })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col">
                <h3 className="text-xl font-primary font-bold text-gray-800 mb-2 line-clamp-1 overflow-hidden">
                  {announcement.title}
                </h3>
                <p className="text-sm text-gray-600 font-secondary mb-4 flex-1 line-clamp-1 overflow-hidden">
                  {announcement.content.split('\n')[0] || announcement.content.substring(0, 100)}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 font-secondary mt-auto">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(announcement.date), 'MMM dd, yyyy')}</span>
                  </div>
                  {announcement.poll && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-blue-600">
                        <BarChart3 className="w-4 h-4" />
                        <span>Poll</span>
                      </div>
                      {(session?.user as any)?.role === 'admin' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowPollResponses(announcement)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                        >
                          See Response
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {mounted && createPortal(
        <AnimatePresence mode="wait">
          {showModal && (
            <motion.div
              key="announcement-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
              onClick={() => !loading && handleCancel()}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-white/50"
              >
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-white/30 px-6 py-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <Megaphone className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-primary font-bold text-gray-800">
                      {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                    </h3>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-secondary">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-primary font-semibold text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-secondary"
                      placeholder="Enter announcement title"
                      required
                      maxLength={200}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-primary font-semibold text-gray-700 mb-2">
                      Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-secondary min-h-[200px] resize-y"
                      placeholder="Enter announcement content"
                      required
                      maxLength={5000}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-primary font-semibold text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={getTodayDate()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-secondary"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Poll Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <label className="flex items-center gap-2 text-sm font-primary font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.hasPoll}
                          onChange={(e) => setFormData({ ...formData, hasPoll: e.target.checked, pollQuestion: '', pollOptions: ['', ''] })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          disabled={loading}
                        />
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Add Poll
                      </label>
                    </div>

                    {formData.hasPoll && (
                      <div className="space-y-4 bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                        <div>
                          <label className="block text-sm font-primary font-semibold text-gray-700 mb-2">
                            Poll Question *
                          </label>
                          <input
                            type="text"
                            value={formData.pollQuestion}
                            onChange={(e) => setFormData({ ...formData, pollQuestion: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-secondary"
                            placeholder="Enter poll question"
                            maxLength={500}
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-primary font-semibold text-gray-700 mb-2">
                            Poll Options * (at least 2)
                          </label>
                          {formData.pollOptions.map((option, index) => (
                            <div key={index} className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...formData.pollOptions];
                                  newOptions[index] = e.target.value;
                                  setFormData({ ...formData, pollOptions: newOptions });
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-secondary"
                                placeholder={`Option ${index + 1}`}
                                maxLength={200}
                                disabled={loading}
                              />
                              {formData.pollOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = formData.pollOptions.filter((_, i) => i !== index);
                                    setFormData({ ...formData, pollOptions: newOptions });
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  disabled={loading}
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, pollOptions: [...formData.pollOptions, ''] })}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-secondary text-sm font-semibold"
                            disabled={loading || formData.pollOptions.length >= 10}
                          >
                            <PlusCircle className="w-4 h-4" />
                            Add Option
                          </button>
                          {formData.pollOptions.length >= 10 && (
                            <p className="text-xs text-gray-500 mt-1">Maximum 10 options allowed</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow font-secondary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <LoadingDots size="sm" />
                          <span>{editingAnnouncement ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>{editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}</span>
                        </>
                      )}
                    </motion.button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-secondary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, announcement: null })}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteModal.announcement?.title}"? This action cannot be undone.`}
        loading={deleting}
      />

      {/* Poll Responses Modal */}
      {mounted && showPollResponses && showPollResponses.poll && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowPollResponses(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative border border-white/50"
            >
              <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-white/30 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-primary font-bold text-gray-800">Poll Responses</h3>
                    <p className="text-sm text-gray-600 font-secondary">{showPollResponses.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPollResponses(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-lg font-primary font-semibold text-gray-800 mb-2">
                    {showPollResponses.poll.question}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Total Votes: {showPollResponses.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0)}
                  </p>
                </div>

                <div className="space-y-4">
                  {showPollResponses.poll.options.map((option, index) => {
                    const voteCount = option.votes.length;
                    const totalVotes = showPollResponses.poll!.options.reduce((sum, opt) => sum + opt.votes.length, 0);
                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

                    return (
                      <div key={index} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-secondary font-semibold text-gray-800">{option.text}</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {voteCount} votes ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                          />
                        </div>
                        {option.votes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-2 font-semibold">Voters:</p>
                            <div className="flex flex-wrap gap-2">
                              {option.votes.map((vote: any, voteIndex: number) => (
                                <div
                                  key={voteIndex}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-secondary"
                                >
                                  {typeof vote.userId === 'object' && vote.userId && 'name' in vote.userId
                                    ? (vote.userId as any).name
                                    : 'Unknown User'}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

