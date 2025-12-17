'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { showBrowserNotification } from '@/lib/notificationTrigger';

export default function GlobalNotificationListener() {
  const { data: session } = useSession();
  const router = useRouter();
  const lastNotificationIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!session || typeof window === 'undefined') {
      return;
    }

    // Check notification permission
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch((error) => {
        console.error('Error requesting notification permission:', error);
      });
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    // Function to check for new notifications and show them
    const checkAndShowNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?limit=1&includeDismissed=false&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();

        if (res.ok && data.notifications && data.notifications.length > 0) {
          const latestNotification = data.notifications[0];

          // Check if this is a new notification
          if (
            latestNotification._id !== lastNotificationIdRef.current &&
            !latestNotification.read
          ) {
            lastNotificationIdRef.current = latestNotification._id;

            // Determine URL based on notification type
            let url = '/';
            if (latestNotification.type === 'mention') {
              url = '/employee/feed';
            } else if (
              latestNotification.type === 'leave_approved' ||
              latestNotification.type === 'leave_rejected'
            ) {
              url = '/employee/leaves';
            } else if (latestNotification.type === 'leave_request') {
              url = '/hr/leave-request';
            }

            // Show browser notification immediately
            showBrowserNotification(latestNotification.title, latestNotification.message, {
              icon: '/assets/maverixicon.png',
              badge: '/assets/maverixicon.png',
              tag: `notification-${latestNotification._id}`,
              data: {
                notificationId: latestNotification._id,
                type: latestNotification.type,
                url,
                leaveId: latestNotification.leaveId?._id || latestNotification.leaveId,
                feedId: latestNotification.feedId?._id || latestNotification.feedId,
              },
              requireInteraction: false, // Don't require interaction - just show it
            });
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Initial check
    checkAndShowNotifications();

    // Poll for new notifications every 1 second for faster response
    pollingIntervalRef.current = setInterval(checkAndShowNotifications, 1000);

    // Also listen for custom events (when notifications are created)
    const handleNotificationCreated = (event: CustomEvent) => {
      const notification = event.detail;
      if (notification && notification._id !== lastNotificationIdRef.current) {
        lastNotificationIdRef.current = notification._id;
        showBrowserNotification(notification.title, notification.message, {
          icon: '/assets/mobileicon.jpg',
          badge: '/assets/maverixicon.png',
          tag: `notification-${notification._id}`,
          data: {
            notificationId: notification._id,
            type: notification.type,
            url:
              notification.type === 'mention'
                ? '/employee/feed'
                : notification.type === 'leave_approved' || notification.type === 'leave_rejected'
                ? '/employee/leaves'
                : '/',
          },
        });
      }
    };

    window.addEventListener('notificationCreated' as any, handleNotificationCreated as EventListener);

    // Handle notification clicks
    const handleNotificationClick = (event: Event) => {
      const notification = (event.target as Notification);
      const data = notification.data;
      if (data && data.url) {
        router.push(data.url);
      }
      notification.close();
    };

    // Listen for notification clicks
    if ('Notification' in window) {
      // Note: Notification click events are handled by the browser
      // We can add a click handler if needed in the future
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      window.removeEventListener(
        'notificationCreated' as any,
        handleNotificationCreated as EventListener
      );
    };
  }, [session, router]);

  return null; // This component doesn't render anything
}

