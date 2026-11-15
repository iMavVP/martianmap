/* Martian Map offline support (service worker).
   - The website's own files: network first, so updates show at once; the saved copy is used when offline.
   - NASA map tiles and imagery: saved the first time they load and reused after, so places you've visited (or saved with
     Settings → "Save Jezero for offline") still draw with no connection.
   - NASA live feeds (weather, raw images, space weather): network first, last saved answer when offline.
   Google sign-in is never cached. */
const V = "mm-v9", SHELL = "mm-shell-" + V, TILES = "mm-tiles", TILES_CORS = "mm-tiles-cors", FEEDS = "mm-feeds";
const MAX_TILES = 2500;
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["./", "index.html", "eva.html", "css/app.css", "css/ui.css", "css/eva.css"]).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("mm-shell-") && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const TILE_HOSTS = /(^|\.)trek\.nasa\.gov$|(^|\.)gibs\.earthdata\.nasa\.gov$|(^|\.)sdo\.gsfc\.nasa\.gov$|(^|\.)assets\.science\.nasa\.gov$|(^|\.)fonts\.(googleapis|gstatic)\.com$|(^|\.)mars\.nasa\.gov$/;
let trimming = false;
async function trim(name) {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(name), ks = await c.keys(); if (ks.length > MAX_TILES) for (const k of ks.slice(0, ks.length - MAX_TILES)) await c.delete(k); } catch (_) {}
  trimming = false;
}
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (/accounts\.google|googleusercontent|gsi\/client/.test(r.url)) return;
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then((c) => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: r.mode === "navigate" }).then((m) => m || caches.match("index.html"))));
    return;
  }
  const feed = /\/rss\/api\/|api\.nasa\.gov|sdo\.gsfc\.nasa\.gov\/assets\/img\/latest/.test(r.url);
  if (feed) { e.respondWith(fetch(r).then((res) => { const cp = res.clone(); caches.open(FEEDS).then((c) => c.put(r, cp)); return res; }).catch(() => caches.match(r, { cacheName: FEEDS }).then((m) => m || Response.error()))); return; }
  if (!TILE_HOSTS.test(u.hostname)) return;
  // A tile read as pixels (CORS) and a tile shown as a picture (no-cors) are stored apart, so each gets the kind it needs.
  const name = r.mode === "cors" ? TILES_CORS : TILES;
  e.respondWith(caches.open(name).then((c) => c.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok || res.type === "opaque") { c.put(r, res.clone()); trim(name); } return res; }))));
});
