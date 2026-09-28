const VERSION = 'v2';
const SHELL_CACHE = `news-pwa-shell-${VERSION}`;
const IMAGE_CACHE = `news-pwa-images-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/theme.js',
  './js/rssParser.js',
  './js/jsonFeedParser.js',
  './js/newsApiParser.js',
  './js/storage.js',
  './js/sources.js',
  './js/newsList.js',
  './js/articleDetail.js',
  './js/settings.js',
  './js/sync.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== SHELL_CACHE && key !== IMAGE_CACHE).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isShellRequest(url) {
  return url.origin === self.location.origin && !url.pathname.startsWith('/api/');
}

function isImageRequest(request) {
  return request.destination === 'image';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    // ニュース取得APIは常に最新を取りに行く(オフライン時はクライアント側のIndexedDBキャッシュに委ねる)
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (isShellRequest(url) && request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'fetch-news') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'news-updated' }));
      })
    );
  }
});
