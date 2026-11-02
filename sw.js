// sw.js — מטמון בסיסי כדי שהאפליקציה תיפתח גם בלי חיבור.
// מעלים את VERSION בכל פעם שמעדכנים קבצים, כדי שהמכשירים יטענו את הגרסה החדשה.
const VERSION = 'v15';
const CACHE = 'math-app-' + VERSION;
const SHELL = ['./', 'index.html', 'app.js', 'engine.js', 'times.js', 'insights.js', 'ability.js', 'family.js', 'store.js', 'fb.js', 'config.js', 'style.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('math-app-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// קבצים מקומיים: קודם הרשת (כדי לקבל עדכונים), ואם אין חיבור — המטמון. קבצים חיצוניים (פונט, Firebase) לא נוגעים.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
