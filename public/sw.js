// MaveriX Push Notification Service Worker
// This service worker handles push notifications even when the app is closed

const CACHE_NAME = 'maverix-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      }),
    ])
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  let notificationData = {
    title: 'MaveriX',
    body: 'You have a new notification',
    icon: '/assets/maverixicon.png',
    badge: '/assets/maverixicon.png',
    tag: 'maverix-notification',
    data: {
      url: '/',
    },
  };

  // Parse the push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        tag: payload.tag || notificationData.tag,
        data: payload.data || notificationData.data,
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [],
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      // Try to get text data
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      actions: notificationData.actions,
      vibrate: [200, 100, 200], // Vibration pattern for mobile
    })
  );
});

// Notification click event - handle when user clicks the notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // Handle action buttons if clicked
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);
    // Handle specific actions here if needed
  }

  // Focus existing window or open new one
  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate the existing window to the notification URL
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // No existing window, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Notification close event - handle when user dismisses the notification
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event);
  // You can track dismissed notifications here if needed
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync event (for future use)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

console.log('[SW] Service Worker loaded');
