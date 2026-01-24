'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Convert base64 URL to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[Push] Service workers not supported');
      return null;
    }

    try {
      // Register the service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Push] Service Worker registered:', registration.scope);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service Worker is ready');

      setSwRegistration(registration);
      return registration;
    } catch (error) {
      console.error('[Push] Service Worker registration failed:', error);
      return null;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (registration: ServiceWorkerRegistration) => {
    if (!session) return;

    try {
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key from environment
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
          console.error('[Push] VAPID public key not configured');
          return;
        }

        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        console.log('[Push] New push subscription created');
      } else {
        console.log('[Push] Existing push subscription found');
      }

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });

      if (response.ok) {
        console.log('[Push] Subscription saved to server');
      } else {
        console.error('[Push] Failed to save subscription to server');
      }
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
    }
  }, [session]);

  // Main effect to set up push notifications
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check browser support
    const notificationsSupported = 'Notification' in window;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    const pushSupported = 'PushManager' in window;

    setIsSupported(notificationsSupported && serviceWorkerSupported && pushSupported);

    if (notificationsSupported) {
      setPermission(Notification.permission);
    }

    if (!session) return;

    // Register service worker regardless of permission
    // This ensures SW is ready when permission is granted
    registerServiceWorker().then((registration) => {
      if (!registration) return;

      // If permission already granted, subscribe to push
      if (Notification.permission === 'granted') {
        subscribeToPush(registration);
      }
    });
  }, [session, registerServiceWorker, subscribeToPush]);

  // Request permission and subscribe
  useEffect(() => {
    if (!session || !isSupported) return;

    if (Notification.permission === 'default') {
      // Auto-request permission after a short delay
      const timer = setTimeout(async () => {
        try {
          const result = await Notification.requestPermission();
          setPermission(result);

          if (result === 'granted' && swRegistration) {
            await subscribeToPush(swRegistration);
          }
        } catch (error) {
          console.error('[Push] Error requesting notification permission:', error);
        }
      }, 2000); // Wait 2 seconds after page load

      return () => clearTimeout(timer);
    }
  }, [session, isSupported, swRegistration, subscribeToPush]);

  // This component doesn't render anything visible
  return null;
}
