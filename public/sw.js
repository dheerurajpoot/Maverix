// Service Worker for MM HRM PWA
// Version: 1.0.0 - Auto-incremented on build

const CACHE_NAME = 'mm-hrm-v1.0.3'; // Updated to fix 404 errors for CSS/JS files
const RUNTIME_CACHE = 'mm-hrm-runtime-v1.0.1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/assets/mobileicon.jpg',
  '/assets/preloader.png',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-icon-180x180.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // CRITICAL: Never intercept POST/PUT/DELETE requests - they must go directly to network
  // This is especially important for authentication (login/logout) and form submissions
  if (request.method !== 'GET') {
    return;
  }

  // CRITICAL: For navigation requests, always use network-first to avoid redirect issues
  // iOS Safari doesn't allow service workers to serve responses with redirects
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstForNavigation(request)
    );
    return;
  }

  // CRITICAL: Don't cache Next.js build artifacts (CSS, JS chunks) - let Next.js handle them
  // These files are dynamically generated and can cause 404 errors if cached incorrectly
  if (url.pathname.startsWith('/_next/static/')) {
    // Let Next.js handle these files directly - don't intercept
    return;
  }

  // CRITICAL: Never intercept authentication API routes - let them go directly to network
  // This prevents service worker from interfering with login/logout/session management
  if (url.pathname.startsWith('/api/auth/')) {
    // Don't intercept auth routes at all - let them bypass service worker
    return;
  }

  // Skip other API routes that need fresh data
  if (url.pathname.startsWith('/api/')) {
    // For other APIs, try network first, fallback to cache
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // For static assets (images from /assets, /icons, /manifest.json), use cache-first strategy
  // But skip Next.js build artifacts which are handled above
  event.respondWith(
    cacheFirstStrategy(request)
  );
});

// Network-first for navigation requests (to avoid redirect issues on iOS)
async function networkFirstForNavigation(request) {
  try {
    // Always try network first for navigation requests
    const networkResponse = await fetch(request);
    
    // CRITICAL: Never cache redirect responses (iOS Safari limitation)
    // Redirect status codes: 301, 302, 307, 308
    const isRedirect = networkResponse.status >= 300 && networkResponse.status < 400;
    
    if (isRedirect) {
      // Don't cache redirects, just return them
      return networkResponse;
    }
    
    // Only cache successful non-redirect responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Clone before caching
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache (but only for non-redirect responses)
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Double-check it's not a redirect
      if (cachedResponse.status < 300 || cachedResponse.status >= 400) {
        return cachedResponse;
      }
    }
    
    // If cache fails or contains redirect, return offline page
    const staticCache = await caches.open(CACHE_NAME);
    const offlinePage = await staticCache.match(OFFLINE_PAGE);
    if (offlinePage) {
      return offlinePage;
    }
    
    throw error;
  }
}

// Cache-first strategy: Check cache first, then network (for static assets only)
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached version
      return cachedResponse;
    }

    // Try network
    try {
      const networkResponse = await fetch(request);
      
      // Only cache successful, non-redirect responses
      const isRedirect = networkResponse.status >= 300 && networkResponse.status < 400;
      
      if (networkResponse && networkResponse.status === 200 && !isRedirect) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      // Network failed, return offline page for navigation requests
      if (request.mode === 'navigate') {
        const cache = await caches.open(CACHE_NAME);
        const offlinePage = await cache.match(OFFLINE_PAGE);
        if (offlinePage) {
          return offlinePage;
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('[Service Worker] Cache-first failed:', error);
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = await cache.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }
    throw error;
  }
}

// Network-first strategy: Try network first, then cache (for API routes)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // CRITICAL: Never cache redirect responses (iOS Safari limitation)
    const isRedirect = networkResponse.status >= 300 && networkResponse.status < 400;
    
    // CRITICAL: Never cache API responses - always get fresh data
    // This prevents stale data issues, especially for authentication
    // Only return the network response without caching
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Double-check it's not a redirect
      if (cachedResponse.status < 300 || cachedResponse.status >= 400) {
        return cachedResponse;
      }
    }
    
    // If it's a navigation request and cache fails, return offline page
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = await cache.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    throw error;
  }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Background sync (for future offline form submissions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('[Service Worker] Background sync');
}

