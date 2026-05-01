// Gamletun Vedlikehold — minimal service worker
//
// Strategy:
//   - Static Next.js assets under /_next/static and the public icons/logo are
//     cached forever (immutable). After the first load they come from disk.
//   - Everything else (HTML pages, Supabase requests, API routes) is fetched
//     network-first so the user always sees fresh data when online. If the
//     network fails, we fall back to whatever we have cached.
//
// Bump CACHE_VERSION when you ship a breaking change to make clients
// drop their old caches.

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `gamletun-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `gamletun-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isImmutableStatic(url) {
  // Next.js fingerprints these — they never change content, safe to cache forever.
  return url.pathname.startsWith('/_next/static/');
}

function isPrecached(url) {
  return PRECACHE_URLS.includes(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GETs from our own origin. Let everything else pass through.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept auth callbacks, API routes or Supabase auth — these must
  // always hit the network and have side effects.
  if (
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  if (isImmutableStatic(url) || isPrecached(url)) {
    // Cache-first
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // For HTML navigations and other GETs: network-first, fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Stash a copy for offline fallback. Don't cache opaque/redirect responses.
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
