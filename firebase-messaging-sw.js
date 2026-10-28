// Service worker da Cota: notificações (Firebase Cloud Messaging) e funcionamento offline
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js", "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey: "AIzaSyCz9xPjJc2gASfN9hwsqyaQcdJOYXH1xNs",
  authDomain: "jay-loma.firebaseapp.com",
  projectId: "jay-loma",
  storageBucket: "jay-loma.firebasestorage.app",
  messagingSenderId: "713532368601",
  appId: "1:713532368601:web:500ac3b6689b695f7c40c8"
});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(p => {
  if (p.notification) return; // o navegador já mostra
  const d = p.data || {};
  self.registration.showNotification(d.title || "Cota", { body: d.body || "", icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { link: d.link || "./" } });
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const link = (e.notification.data && (e.notification.data.link || (e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.fcmOptions && e.notification.data.FCM_MSG.fcmOptions.link))) || "./";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => { for (const w of ws) { if ("focus" in w) return w.focus(); } return clients.openWindow(link); }));
});
const CACHE = "cota-v3";
const SHELL = ["./", "./index.html", "./runtime.js", "./firebase-config.js", "./manifest.webmanifest", "./icons/icon-192.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k); await clients.claim(); })()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match("./index.html"))));
});
