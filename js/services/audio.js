let unlocked = false;
const sounds = {};

const DEFAULT_PATHS = {
  preArrival: 'assets/audio/pre-arrival.wav',
  arrival:    'assets/audio/arrival.wav',
  collision:  null,   // varsayılan yok — kullanıcı yükler veya sessiz kalır
};

export function initAudio(customSounds = {}) {
  for (const [type, defaultPath] of Object.entries(DEFAULT_PATHS)) {
    const src = customSounds[type] || defaultPath;
    if (!src) continue;
    try {
      const audio = new Audio();
      // Hata sessizce yutulsun — ses olmadan uygulama çalışmaya devam eder
      audio.addEventListener('error', () => {
        console.warn(`[audio] "${type}" yüklenemedi (${src}) — sesler devre dışı`);
        sounds[type] = null;
      });
      audio.src = src;
      audio.load();
      sounds[type] = audio;
    } catch (e) {
      console.warn(`[audio] "${type}" başlatılamadı:`, e);
    }
  }
}

/** Özel ses dosyasını günceller (base64 data URL veya object URL) */
export function setCustomSound(type, dataUrl) {
  if (!dataUrl) {
    // Varsayılana geri dön
    const path = DEFAULT_PATHS[type];
    sounds[type] = path ? new Audio(path) : null;
    if (sounds[type]) sounds[type].load();
    return;
  }
  sounds[type] = new Audio(dataUrl);
  sounds[type].load();
}

// İlk kullanıcı etkileşiminde çağrılmalı (tarayıcı autoplay politikası)
export async function unlockAudio() {
  if (unlocked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    unlocked = true;
  } catch (e) {
    console.warn('[audio] Unlock failed:', e);
  }
}

// type: 'preArrival' | 'arrival' | 'collision'
export function playSound(type, enabled = true) {
  if (!enabled || !unlocked) return;
  const snd = sounds[type];
  if (!snd) return;
  try {
    snd.currentTime = 0;
    snd.play().catch(() => {}); // Promise rejection sessizce yutulsun
  } catch (e) {
    // Ses olmadan devam et
  }
}
