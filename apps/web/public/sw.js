self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const title = payload.title || "Shared Alarm";
  const options = {
    body: payload.body || "Notification",
    icon: "/alarm-icon.png",
    badge: "/alarm-icon.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  if (data && data.alarmId) {
    event.waitUntil(
      clients.openWindow("/share/" + (data.shareToken || ""))
    );
  }
});
