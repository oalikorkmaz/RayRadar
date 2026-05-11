const CACHE_NAME = 'tren-izleme-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/reset.css',
  './styles/base.css',
  './styles/header.css',
  './styles/track-view.css',
  './styles/train-list.css',
  './styles/modal.css',
  './styles/alerts.css',
  './styles/responsive.css',
  './js/main.js',
  './js/constants/stations.js',
  './js/constants/config.js',
  './js/models/Train.js',
  './js/models/Line.js',
  './js/services/storage.js',
  './js/services/time.js',
  './js/services/audio.js',
  './js/services/notification.js',
  './js/services/vibration.js',
  './js/services/collision.js',
  './js/services/alerts.js',
  './js/ui/App.js',
  './js/ui/TrackView.js',
  './js/ui/TrainList.js',
  './js/ui/TrainCard.js',
  './js/ui/TrainForm.js',
  './js/ui/AlertBanner.js',
  './js/ui/SettingsPanel.js',
  './js/ui/StaleTrainsModal.js',
  './js/ui/FirstLaunch.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/audio/pre-arrival.wav',
  './assets/audio/arrival.wav',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
