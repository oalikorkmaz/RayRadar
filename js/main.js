import { boot } from './ui/App.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => {
    console.warn('[SW] Registration failed:', e);
  });
}

boot();
