// Filled in by the build (vite.config.js): the version is a digest of the files.
const CACHE = 'caipirinha-__VERSION__';
const FILES = __FILES__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Straight from the server, past the browser's own cache: a copy made minutes after a
      // deploy must not mix the new files with an old index.html.
      .then((cache) => cache.addAll(FILES.map((file) => new Request(new URL(file, self.location.href), { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The phone's copy first; the network only for what the copy lacks.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      if (request.mode === 'navigate') return caches.match('index.html').then((page) => page || fetch(request));
      return fetch(request);
    }),
  );
});
