import { playSound } from './audio.js';
import { sendNotification } from './notification.js';
import { vibrate, VIBRATION_PATTERNS } from './vibration.js';

/**
 * addBanner: (banner: { type, message, autoDismissMs }) => void
 * Injected by App.js so alerts don't import App (avoid circular deps).
 */

export function triggerPreArrivalAlert(train, remainingMinutes, settings, addBanner) {
  const label = `Tren ${train.trainNumber}`;
  const mins  = Math.ceil(remainingMinutes);
  const msg   = `${label} yaklaşıyor — ${mins} dk içinde Pazarcık'ta`;

  playSound('preArrival', settings.soundEnabled);
  sendNotification(label, msg);
  vibrate(VIBRATION_PATTERNS.preArrival, settings.vibrationEnabled);
  addBanner({ type: 'warning', message: msg, autoDismissMs: 5000 });
}

export function triggerArrivalAlert(train, settings, addBanner) {
  const label = `Tren ${train.trainNumber}`;
  const msg   = `${label} PAZARCIK'TA`;

  playSound('arrival', settings.soundEnabled);
  sendNotification(label, `${train.trainNumber} Pazarcık'a vardı`);
  vibrate(VIBRATION_PATTERNS.arrival, settings.vibrationEnabled);
  addBanner({ type: 'arrival', message: `🚆 ${msg}`, autoDismissMs: null });
}

export function triggerCollisionAlert(collision, addBanner) {
  const mins = collision.estimatedMinutes;
  const eta  = mins > 0 ? `~${mins} dk sonra ` : '';
  const msg  = `⚠️ Tren ${collision.trainA.trainNumber} ${eta}Tren ${collision.trainB.trainNumber} ile karşılaşabilir`;
  addBanner({ type: 'collision', message: msg, autoDismissMs: null });
}
