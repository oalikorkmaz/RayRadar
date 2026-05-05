export function minutesRemaining(startedAt, durationMin) {
  const elapsedMs = Date.now() - startedAt;
  return durationMin - elapsedMs / 60_000;
}

export function formatMinutes(minutes) {
  if (minutes <= 0) return '0dk';
  return `${Math.ceil(minutes)}dk`;
}

export function formatTime(timestamp) {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
