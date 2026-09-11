// Minimal, cache'siz service worker. PRD Bölüm 12 (soru 4) gereği v1'de
// offline destek yok — bu worker hiçbir şeyi önbelleğe almaz, sadece
// Chrome/Android'in "ana ekrana ekle" kurulabilirlik kriterini
// (fetch handler'lı bir SW şartı) karşılamak için var.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
