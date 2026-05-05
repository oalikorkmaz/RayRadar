export const VIBRATION_PATTERNS = {
  preArrival: [200],
  arrival:    [500, 200, 500, 200, 500],
};

export function vibrate(pattern, enabled = true) {
  if (!enabled || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}
