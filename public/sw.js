// Network-first service worker.
//  - Khi online: luôn lấy bản mới (app + API), đồng thời lưu cache.
//  - Khi mạng chập chờn / offline: phục vụ lại từ cache (kể cả dữ liệu API).
// SWR phía client lo phần stale-while-revalidate + optimistic; SW lo phần offline.
const CACHE = "biball-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })
  );
});
