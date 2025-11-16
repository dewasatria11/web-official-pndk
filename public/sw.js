const CACHE_NAME = 'ppdsb-pwa-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/alur-pendaftaran.html',
  '/admin.html',
  '/biaya.html',
  '/brosur.html',
  '/cek-status.html',
  '/daftar.html',
  '/kontak.html',
  '/login.html',
  '/pembayaran.html',
  '/syarat-pendaftaran.html',
  '/offline.html',
  '/assets/css/tailwind.css',
  '/assets/js/navbar.js',
  '/assets/js/pwa.js',
  '/i18n.js',
  '/locales/id.json',
  '/locales/en.json',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/logo-bimi.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
    return;
  }

  // 🚫 Jangan cache request API supaya data admin (pendaftar/pembayaran/etc) selalu real-time
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  if (isHtmlRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

function isHtmlRequest(request) {
  return request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const freshResponse = await fetch(request);
    cache.put(request, freshResponse.clone());
    return freshResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    return cachedResponse || cache.match('/offline.html');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const freshResponse = await fetch(request);
    cache.put(request, freshResponse.clone());
    return freshResponse;
  } catch (error) {
    return isHtmlRequest(request) ? cache.match('/offline.html') : Response.error();
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return Response.error();
  }
}
