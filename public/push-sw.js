/* eslint-disable */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" ? payload.title : "HealthyU";
  // Only allow internal app paths to avoid open-redirect via push payload.
  const rawUrl = typeof payload.url === "string" ? payload.url : "";
  const safeUrl = rawUrl.startsWith("/") && !rawUrl.startsWith("//") ? rawUrl : "/dashboard";
  const options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    tag: typeof payload.tag === "string" ? payload.tag : "healthyu",
    data: { url: safeUrl },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || "/dashboard";
  const url = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
