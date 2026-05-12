function capacitorNotifications() {
  return window.Capacitor?.Plugins?.LocalNotifications ?? null;
}

export async function requestNotificationPermission() {
  const ln = capacitorNotifications();
  if (ln) {
    const { display } = await ln.requestPermissions();
    return display === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'unavailable';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function getNotificationPermission() {
  if (capacitorNotifications()) return 'granted';
  if (!('Notification' in window)) return 'unavailable';
  return Notification.permission;
}

export async function sendNotification(title, body) {
  const ln = capacitorNotifications();
  if (ln) {
    await ln.schedule({
      notifications: [{ title, body, id: Date.now() % 2147483647 }],
    });
    return;
  }
  if (getNotificationPermission() !== 'granted') return;
  new Notification(title, {
    body,
    icon: 'assets/icons/icon.png',
    badge: 'assets/icons/icon.png',
  });
}
