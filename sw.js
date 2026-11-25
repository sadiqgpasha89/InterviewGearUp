/* Offline support. Network first for same-origin files (so a new deploy shows up immediately when online),
   falling back to the cache when offline. Cross-origin requests (GitHub API, LLM providers) are never touched. */
const CACHE = 'igu-v1';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'favicon.svg',
  'manifest.webmanifest',
  'js/theme.js',
  'js/config.js',
  'js/util.js',
  'js/engine.js',
  'js/stats.js',
  'js/app.js',
  'data/general.js',
  'data/frontend.js',
  'data/backend.js',
  'data/devops.js',
  'data/data.js',
  'data/ml.js',
  'data/qa.js',
  'data/security.js',
  'data/leadership.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(function (res) {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
  }));
});
