/**
 * Utility to trigger browser notifications immediately when they're created
 * This works across all pages and browser profiles
 */

export function showBrowserNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
  }
): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return;
  }

  // Check permission
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  const notificationOptions: NotificationOptions = {
    body,
    icon: options?.icon || '/assets/maverixicon.png',
    badge: options?.badge || '/assets/maverixicon.png',
    tag: options?.tag || 'maverix-notification',
    data: options?.data || {},
    requireInteraction: options?.requireInteraction || false,
  };

  // Use direct Notification API (no service worker needed)
  new Notification(title, notificationOptions);
}

