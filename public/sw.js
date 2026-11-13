self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? "" };
  }

  const title = typeof payload.title === "string" ? payload.title : "JobPulse";
  const body = typeof payload.body === "string" ? payload.body : "You have an update.";
  const target = new URL(
    typeof payload.url === "string" ? payload.url : "/",
    self.location.origin
  );
  const url = target.origin === self.location.origin ? target.href : self.location.origin;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url;
  const url = new URL(typeof target === "string" ? target : "/", self.location.origin);
  const safeUrl = url.origin === self.location.origin ? url.href : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url === safeUrl);
      return existing ? existing.focus() : self.clients.openWindow(safeUrl);
    })
  );
});
