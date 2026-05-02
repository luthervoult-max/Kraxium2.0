const CACHE_NAME = 'kraxium-static-v2';

const APP_SHELL = [
  '/',
  '/site.webmanifest',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

const isSameOriginGet = (request) => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin;
};

const shouldBypassCache = (url) =>
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/auth/') ||
  url.pathname.startsWith('/rest/') ||
  url.pathname.startsWith('/storage/') ||
  url.pathname.startsWith('/functions/');

const cacheResponse = (request, response) => {
  if (!response.ok) return response;

  const responseClone = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
  return response;
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!isSameOriginGet(request)) return;

  const url = new URL(request.url);
  if (shouldBypassCache(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }

  if (!['font', 'image', 'manifest', 'script', 'style'].includes(request.destination)) return;

  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request)
        .then((response) => cacheResponse(request, response))
        .catch(() => caches.match(request).then((cachedResponse) => cachedResponse || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => cacheResponse(request, response))
        .catch(() => cachedResponse || Response.error());

      return cachedResponse || networkResponse;
    }),
  );
});
