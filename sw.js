/* Moneymaking G service worker — cache static shell, always network for /api/ */
const CACHE = "moneymaking-g-v2";
const PRECACHE = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/api.js",
  "./js/fun.js",
  "./js/app.js",
  "./sounds/kaching.wav",
  "./js/charts.js",
  "./js/mock.js",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./fonts/Inter.var.ttf"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.pathname.includes("/api/") || url.searchParams.has("stream")) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => {
      const fresh = fetch(event.request)
        .then((res) => {
          if (res && res.ok && res.type !== "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Moneymaking G", body: "New update" };
  try {
    if (event.data) data = Object.assign(data, event.data.json());
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients[0]) return clients[0].focus();
      return self.clients.openWindow("./#/home");
    })
  );
});
