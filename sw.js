/* Offline support. Network first for same-origin files (so a new deploy shows up immediately when online),
   falling back to the cache when offline. Cross-origin requests (GitHub API, LLM providers) are never touched. */
const CACHE = 'igu-v21';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'favicon.svg',
  'manifest.webmanifest',
  'assets/apple-touch-icon.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'js/theme.js',
  'js/config.js',
  'js/util.js',
  'js/quality.js',
  'js/engine.js',
  'js/search.js',
  'js/ai.js',
  'js/stats.js',
  'js/srs.js',
  'js/migrate.js',
  'js/adaptive.js',
  'js/planner.js',
  'js/dashboard.js',
  'js/readiness.js',
  'js/mock.js',
  'js/stories.js',
  'js/jd.js',
  'js/design.js',
  'data/design.js',
  'js/company.js',
  'js/voice.js',
  'js/coding-core.js',
  'js/coding.js',
  'js/paths.js',
  'js/topic-map.js',
  'js/warmup.js',
  'js/calendar.js',
  'js/flashcards.js',
  'js/sync.js',
  'js/starter-paths.js',
  'js/runner-worker.js',
  'data/coding.js',
  'data/coding-langs.js',
  'data/coding2.js',
  'js/views2.js',
  'js/views3.js',
  'js/views4.js',
  'js/views5.js',
  'js/views6.js',
  'js/views7.js',
  'js/views.js',
  'js/app.js',
  'data/general.js',
  'data/frontend.js',
  'data/backend.js',
  'data/devops.js',
  'data/data.js',
  'data/ml.js',
  'data/qa.js',
  'data/security.js',
  'data/leadership.js',
  'data/curated/general.js',
  'data/curated/frontend.js',
  'data/curated/backend.js',
  'data/curated/devops.js',
  'data/curated/data.js',
  'data/curated/ml.js',
  'data/curated/qa.js',
  'data/curated/security.js',
  'data/curated/leadership.js',
  'data/curated/datascience-full.js',
  'data/curated/leadership-full.js',
  'data/curated/security-full.js',
  'data/curated/qa-full.js',
  'data/curated/ml-full.js',
  'data/curated/data-full.js',
  'data/curated/devops-full.js',
  'data/curated/backend-full.js',
  'data/curated/frontend-full.js',
  'data/curated/general-full.js',
  'data/curated/fundamentals-v2.js',
  'data/curated/references.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(function (res) {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      if (req.mode === 'navigate' || req.destination === 'document') return caches.match('index.html');
      return Response.error();
    });
  }));
});
