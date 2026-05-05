export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unavailable';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unavailable';
  return Notification.permission;
}

export function sendNotification(title, body) {
  if (getNotificationPermission() !== 'granted') return;
  new Notification(title, {
    body,
    icon: 'assets/icons/icon-192.png',
    badge: 'assets/icons/icon-192.png',
  });
}
