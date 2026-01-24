'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, MessageSquare, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  url: string;
  timestamp: number;
}

export default function InAppNotificationToast() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const addNotification = useCallback((notification: InAppNotification) => {
    setNotifications(prev => {
      // Don't add duplicate notifications
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      // Keep only last 3 notifications
      const updated = [...prev, notification].slice(-3);
      return updated;
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleClick = useCallback((notification: InAppNotification) => {
    dismissNotification(notification.id);
    if (notification.url) {
      router.push(notification.url);
    }
  }, [dismissNotification, router]);

  useEffect(() => {
    const handleShowNotification = (event: CustomEvent) => {
      const { id, title, message, type, url } = event.detail;
      addNotification({
        id,
        title,
        message,
        type,
        url,
        timestamp: Date.now(),
      });
    };

    window.addEventListener('showInAppNotification' as any, handleShowNotification as EventListener);

    return () => {
      window.removeEventListener('showInAppNotification' as any, handleShowNotification as EventListener);
    };
  }, [addNotification]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'leave_approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'leave_rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'leave_request':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => handleClick(notification)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                  }}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            {/* Progress bar for auto-dismiss */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-1 bg-primary/20 origin-left"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
