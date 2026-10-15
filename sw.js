/* Service worker: desa l'aplicacio al mobil perque arrenqui a l'instant
   i funcioni sense connexio. Pujar la versio buida la copia antiga. */
const VERSION = 'qui-comenca-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Un a un: si en falta algun, la instal·lacio no ha de fracassar sencera.
    await Promise.all(SHELL.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // Serveix del cache a l'instant i refresca al darrere per a la propera obertura.
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: sameOrigin });

    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    if (hit) return hit;
    const res = await net;
    if (res) return res;

    // Sense connexio i sense copia: per a una navegacio, torna la pagina desada.
    if (req.mode === 'navigate') {
      return (await cache.match('./index.html')) || Response.error();
    }
    return Response.error();
  })());
});
