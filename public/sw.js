const CACHE_NAME = 'ei-hub-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Exclude local dev-server HMR, WebSocket upgrades, and hot-reload requests
  if (
    e.request.url.includes('/@vite/') ||
    e.request.url.includes('/@id/') ||
    e.request.url.includes('token=') ||
    e.request.url.includes('websocket') ||
    e.request.headers.get('Upgrade') === 'websocket'
  ) {
    return;
  }

  // Exclude API requests from caching to avoid stale backend data
  if (e.request.url.includes('/api/') || e.request.url.includes('/api-brevo/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((response) => {
        // Only cache valid GET responses
        if (!response || response.status !== 200 || response.type !== 'basic' || e.request.method !== 'GET') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
