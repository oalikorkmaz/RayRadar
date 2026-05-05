let unlocked = false;
const sounds = {};

export function initAudio() {
  sounds.preArrival = new Audio('assets/audio/pre-arrival.mp3');
  sounds.arrival    = new Audio('assets/audio/arrival.mp3');
  sounds.preArrival.load();
  sounds.arrival.load();
}

// Must be called on first user interaction to unlock browser autoplay policy
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

// type: 'preArrival' | 'arrival'
export function playSound(type, enabled = true) {
  if (!enabled || !unlocked) return;
  const snd = sounds[type];
  if (!snd) return;
  snd.currentTime = 0;
  snd.play().catch(e => console.warn('[audio] Play failed:', e));
}
