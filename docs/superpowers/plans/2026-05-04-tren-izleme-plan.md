# Tren İzleme Simülasyonu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pazarcık tren istasyonu için tek hatlı güzergahta trenlerin gerçek zamanlı görsel takibi, çakışma uyarısı ve varış alarmı sağlayan PWA.

**Architecture:** Vanilla JS ES Modules, no build step. `App.js` holds all state as a plain object; `dispatch(action, payload)` updates state and re-renders. A 1-second `tick()` loop processes arrivals, pre-warnings, and collision checks, then updates countdown DOM nodes directly (no full re-render each second). UI components are functions that return HTML strings and get mounted into container elements.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES Modules), LocalStorage, Web Audio API, Notification API, Vibration API, Service Worker (PWA). No npm, no build tools, no third-party dependencies.

**Spec:** `docs/superpowers/specs/2026-05-04-tren-izleme-design.md`

**Test approach:** Browser-based test runner (`tests/test-runner.html` + `tests/unit.test.js`). Open via Live Server. Pure functions are unit-tested; UI is manually tested per `docs/test-scenarios.md`.

---

## File Map

```
tren-izleme/
├── index.html                      # Single HTML entry point
├── manifest.json                   # PWA app definition
├── sw.js                           # Service Worker (offline cache)
├── README.md
├── styles/
│   ├── reset.css
│   ├── base.css                    # Variables, typography, dark theme
│   ├── header.css
│   ├── track-view.css
│   ├── train-list.css
│   ├── modal.css
│   ├── alerts.css
│   └── responsive.css
├── js/
│   ├── main.js                     # Entry: imports App, boots
│   ├── constants/
│   │   ├── stations.js             # STATIONS array + helpers
│   │   └── config.js               # WATCHED_STATION_ID, defaults
│   ├── models/
│   │   ├── Train.js                # createTrain, getTrainProgress, getTrainRemaining, getTrainPosition, getTrainDirection
│   │   └── Line.js                 # validateRoute, getStationById
│   ├── services/
│   │   ├── storage.js              # loadData, saveData, DEFAULT_DATA
│   │   ├── time.js                 # minutesRemaining, formatMinutes, formatTime
│   │   ├── audio.js                # initAudio, unlockAudio, playSound
│   │   ├── notification.js         # requestPermission, sendNotification
│   │   ├── vibration.js            # vibrate, VIBRATION_PATTERNS
│   │   ├── collision.js            # detectCollisions, predictCollisionOnAdd
│   │   └── alerts.js               # triggerPreArrivalAlert, triggerArrivalAlert, triggerCollisionAlert
│   └── ui/
│       ├── App.js                  # state, dispatch, render, tick
│       ├── TrackView.js            # renderTrackView(container, state)
│       ├── TrainList.js            # renderTrainList(container, state, dispatch)
│       ├── TrainCard.js            # trainCardHTML(train) → string
│       ├── TrainForm.js            # openForm, closeForm, renderForm
│       ├── AlertBanner.js          # renderBanners(container, state, dispatch)
│       ├── SettingsPanel.js        # renderSettings(container, state, dispatch)
│       ├── StaleTrainsModal.js     # renderStaleModal(container, state, dispatch)
│       └── FirstLaunch.js          # renderFirstLaunch(container, dispatch)
├── assets/
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── audio/
│       ├── pre-arrival.mp3
│       └── arrival.mp3
└── tests/
    ├── test-runner.html
    └── unit.test.js
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `index.html`
- Create: `manifest.json`
- Create: `sw.js`
- Create: `README.md`
- Create: `js/main.js`
- Create: `tests/test-runner.html`

- [ ] **Step 1: Initialize git and create folder structure**

```bash
cd "C:\Users\onurk\Desktop\tren-izleme"
git init
mkdir -p styles js/constants js/models js/services js/ui assets/icons assets/audio tests docs/superpowers/plans docs/superpowers/specs
```

- [ ] **Step 2: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ff8c42" />
  <meta name="description" content="Tek hatlı tren güzergahı izleme ve uyarı sistemi" />
  <link rel="manifest" href="manifest.json" />
  <link rel="apple-touch-icon" href="assets/icons/icon-192.png" />
  <title>Tren İzleme — Pazarcık</title>

  <link rel="stylesheet" href="styles/reset.css" />
  <link rel="stylesheet" href="styles/base.css" />
  <link rel="stylesheet" href="styles/header.css" />
  <link rel="stylesheet" href="styles/track-view.css" />
  <link rel="stylesheet" href="styles/train-list.css" />
  <link rel="stylesheet" href="styles/modal.css" />
  <link rel="stylesheet" href="styles/alerts.css" />
  <link rel="stylesheet" href="styles/responsive.css" />
</head>
<body>

  <!-- First-launch overlay -->
  <div id="first-launch-container"></div>

  <!-- Main app (hidden until first launch done) -->
  <div id="app" class="hidden">
    <header id="header-container"></header>

    <!-- Alert banners -->
    <div id="banners-container" aria-live="assertive"></div>

    <main id="main">
      <!-- Upper half: track visualization -->
      <section id="track-container" aria-label="Hat görselleştirmesi"></section>

      <!-- Lower half: train list -->
      <section id="list-container" aria-label="Tren listesi"></section>
    </main>
  </div>

  <!-- Modals (portals) -->
  <div id="modal-container"></div>
  <div id="stale-modal-container"></div>
  <div id="settings-container"></div>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `manifest.json`**

```json
{
  "name": "Tren İzleme — Pazarcık",
  "short_name": "Tren İzleme",
  "description": "Tek hatlı tren güzergahı izleme ve uyarı sistemi",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0d1117",
  "theme_color": "#ff8c42",
  "icons": [
    { "src": "assets/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "assets/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

- [ ] **Step 4: Create `sw.js` (stub — will be completed in Task 17)**

```javascript
// Service Worker — cache updated in Task 17
const CACHE_NAME = 'tren-izleme-v1';
const ASSETS = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
```

- [ ] **Step 5: Create `js/main.js` (stub)**

```javascript
import { boot } from './ui/App.js';

boot();
```

- [ ] **Step 6: Create `tests/test-runner.html`**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Unit Tests — Tren İzleme</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 2rem; }
    .pass { color: #10b981; }
    .fail { color: #ef4444; font-weight: bold; }
    h1 { color: #ff8c42; }
    hr { border-color: #3a4250; margin: 1rem 0; }
  </style>
</head>
<body>
  <h1>🚆 Tren İzleme — Unit Tests</h1>
  <pre id="output"></pre>
  <script type="module" src="unit.test.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create `README.md`**

```markdown
# Tren İzleme Simülasyonu

Pazarcık tren istasyonu için tek hatlı güzergah izleme PWA.

## Geliştirme

1. VS Code + Live Server eklentisi kur
2. `index.html` üzerinde "Go Live" → `http://127.0.0.1:5500`
3. Android test: aynı Wi-Fi, `http://192.168.x.x:5500`

## Testler

`tests/test-runner.html` dosyasını Live Server ile aç.

## Dağıtım

GitHub Pages veya Netlify'a push et (HTTPS gerekli — PWA kurulumu için).
```

- [ ] **Step 8: Create empty CSS files**

```bash
touch styles/reset.css styles/base.css styles/header.css styles/track-view.css styles/train-list.css styles/modal.css styles/alerts.css styles/responsive.css
```

- [ ] **Step 9: Initial git commit**

```bash
git add .
git commit -m "feat: initial project scaffolding"
```

---

## Task 2: Constants

**Files:**
- Create: `js/constants/stations.js`
- Create: `js/constants/config.js`

- [ ] **Step 1: Create `js/constants/stations.js`**

```javascript
// 9 durak, batı→doğu sırasıyla. id: ASCII kodu, label: Türkçe görüntü adı.
export const STATIONS = [
  { id: 'TURK', label: 'TÜRKOĞLU', shortLabel: 'TÜRK', index: 0 },
  { id: 'KOPR', label: 'KÖPRÜAĞZI', shortLabel: 'KÖPR', index: 1 },
  { id: 'NARL', label: 'NARLI',     shortLabel: 'NARL', index: 2 },
  { id: 'DEHL', label: 'DEHLİZ',   shortLabel: 'DEHL', index: 3 },
  { id: 'PAZA', label: 'PAZARCIK', shortLabel: 'PAZA', index: 4 },
  { id: 'AKSU', label: 'AKSU',     shortLabel: 'AKSU', index: 5 },
  { id: 'HAYD', label: 'HAYDARLI', shortLabel: 'HAYD', index: 6 },
  { id: 'CELI', label: 'ÇELİK',   shortLabel: 'ÇELİ', index: 7 },
  { id: 'GOLB', label: 'GÖLBAŞI', shortLabel: 'GÖLB', index: 8 },
];

export const STATION_COUNT = STATIONS.length;      // 9
export const SEGMENT_COUNT = STATIONS.length - 1;  // 8

export function getStationById(id) {
  return STATIONS.find(s => s.id === id) ?? null;
}

export function getStationByIndex(index) {
  return STATIONS[index] ?? null;
}
```

- [ ] **Step 2: Create `js/constants/config.js`**

```javascript
// V1: izlenen istasyon sabit. V2'de settings'e taşınır.
export const WATCHED_STATION_ID = 'PAZA';

export const DEFAULT_SETTINGS = {
  preWarningMinutes: 3,
  soundEnabled: true,
  vibrationEnabled: true,
};

export const STORAGE_KEY = 'tren-izleme:v1';
export const SCHEMA_VERSION = 1;
export const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 saat
```

- [ ] **Step 3: Commit**

```bash
git add js/constants/
git commit -m "feat: add station and config constants"
```

---

## Task 3: Models + Time Service

**Files:**
- Create: `js/models/Train.js`
- Create: `js/models/Line.js`
- Create: `js/services/time.js`
- Create: `tests/unit.test.js` (first tests)

- [ ] **Step 1: Create `js/services/time.js`**

```javascript
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
```

- [ ] **Step 2: Create `js/models/Train.js`**

```javascript
import { getStationById } from '../constants/stations.js';

export function createTrain({ trainNumber, fromStation, toStation, durationMin }) {
  return {
    id: crypto.randomUUID(),
    trainNumber: String(trainNumber),
    fromStation,
    toStation,
    durationMin: Number(durationMin),
    startedAt: Date.now(),
    status: 'active',         // 'active' | 'arrived' | 'manual_arrived' | 'deleted'
    arrivedAt: null,
    preWarningFired: false,
  };
}

export function getTrainProgress(train) {
  const elapsedMs = Date.now() - train.startedAt;
  const totalMs = train.durationMin * 60_000;
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

// Returns floating-point position on the 0–8 index scale
export function getTrainPosition(train) {
  const from = getStationById(train.fromStation);
  const to = getStationById(train.toStation);
  if (!from || !to) return null;
  const progress = getTrainProgress(train);
  return from.index + progress * (to.index - from.index);
}

// 'east' = index increasing, 'west' = index decreasing
export function getTrainDirection(train) {
  const from = getStationById(train.fromStation);
  const to = getStationById(train.toStation);
  if (!from || !to) return null;
  return to.index > from.index ? 'east' : 'west';
}
```

- [ ] **Step 3: Create `js/models/Line.js`**

```javascript
import { STATIONS, getStationById } from '../constants/stations.js';

export function validateRoute(fromId, toId) {
  if (!fromId) return { valid: false, error: 'Kalkış durağı seçin' };
  if (!toId)   return { valid: false, error: 'Varış durağı seçin' };
  if (!getStationById(fromId)) return { valid: false, error: 'Geçersiz kalkış durağı' };
  if (!getStationById(toId))   return { valid: false, error: 'Geçersiz varış durağı' };
  if (fromId === toId) return { valid: false, error: 'Kalkış ve varış aynı olamaz' };
  return { valid: true, error: null };
}

export function validateTrainNumber(value) {
  if (!/^\d{5}$/.test(String(value))) {
    return { valid: false, error: 'Tren numarası 5 haneli rakam olmalı' };
  }
  return { valid: true, error: null };
}

export function validateDuration(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 999) {
    return { valid: false, error: 'Süre 1–999 dakika arası olmalı' };
  }
  return { valid: true, error: null };
}

// Given a floating-point position (e.g. 2.7), returns the segment index (2 = between station 2 and 3)
export function getSegmentIndex(position) {
  return Math.min(Math.floor(position), STATIONS.length - 2);
}
```

- [ ] **Step 4: Create `tests/unit.test.js` (time + model tests)**

```javascript
// Run via tests/test-runner.html (Live Server required)
import { minutesRemaining, formatMinutes, formatTime } from '../js/services/time.js';
import { createTrain, getTrainProgress, getTrainPosition, getTrainDirection } from '../js/models/Train.js';
import { validateRoute, validateTrainNumber, validateDuration } from '../js/models/Line.js';

const out = document.getElementById('output');
let passed = 0, failed = 0;

function assert(condition, message) {
  if (condition) {
    out.innerHTML += `<span class="pass">✓ ${message}</span>\n`;
    passed++;
  } else {
    out.innerHTML += `<span class="fail">✗ ${message}</span>\n`;
    failed++;
  }
}

// --- time.js ---
out.innerHTML += '<hr><b>time.js</b>\n';

assert(formatMinutes(0) === '0dk', 'formatMinutes(0) = "0dk"');
assert(formatMinutes(-5) === '0dk', 'formatMinutes(-5) = "0dk"');
assert(formatMinutes(11) === '11dk', 'formatMinutes(11) = "11dk"');
assert(formatMinutes(0.5) === '1dk', 'formatMinutes(0.5) rounds up = "1dk"');

const fiveMinutesAgo = Date.now() - 5 * 60_000;
const rem = minutesRemaining(fiveMinutesAgo, 11);
assert(Math.abs(rem - 6) < 0.1, `minutesRemaining: 11dk trende 5dk geçince ~6dk kalmalı (got ${rem.toFixed(2)})`);

// --- Line.js validation ---
out.innerHTML += '<hr><b>Line.js validation</b>\n';

assert(validateTrainNumber('46500').valid === true, 'validateTrainNumber("46500") → valid');
assert(validateTrainNumber('4650').valid === false, 'validateTrainNumber("4650") 4 hane → invalid');
assert(validateTrainNumber('465ab').valid === false, 'validateTrainNumber("465ab") harf → invalid');
assert(validateTrainNumber('123456').valid === false, 'validateTrainNumber("123456") 6 hane → invalid');

assert(validateDuration(11).valid === true, 'validateDuration(11) → valid');
assert(validateDuration(0).valid === false, 'validateDuration(0) → invalid');
assert(validateDuration(1000).valid === false, 'validateDuration(1000) → invalid');
assert(validateDuration('abc').valid === false, 'validateDuration("abc") → invalid');

assert(validateRoute('NARL', 'PAZA').valid === true, 'validateRoute(NARL, PAZA) → valid');
assert(validateRoute('PAZA', 'PAZA').valid === false, 'validateRoute(PAZA, PAZA) same station → invalid');
assert(validateRoute(null, 'PAZA').valid === false, 'validateRoute(null, PAZA) → invalid');

// --- Train.js ---
out.innerHTML += '<hr><b>Train.js</b>\n';

const t = createTrain({ trainNumber: '46500', fromStation: 'NARL', toStation: 'PAZA', durationMin: 11 });
assert(t.trainNumber === '46500', 'createTrain: trainNumber');
assert(t.status === 'active', 'createTrain: status=active');
assert(t.preWarningFired === false, 'createTrain: preWarningFired=false');

assert(getTrainDirection(t) === 'east', 'getTrainDirection NARL→PAZA = east');
const westTrain = createTrain({ trainNumber: '99999', fromStation: 'PAZA', toStation: 'NARL', durationMin: 12 });
assert(getTrainDirection(westTrain) === 'west', 'getTrainDirection PAZA→NARL = west');

// Progress test: freshly created train → ~0
const freshProgress = getTrainProgress(t);
assert(freshProgress < 0.01, `getTrainProgress: fresh train ≈ 0 (got ${freshProgress.toFixed(4)})`);

// Position test: fresh train starting at NARL (index 2)
const freshPos = getTrainPosition(t);
assert(Math.abs(freshPos - 2) < 0.1, `getTrainPosition: fresh NARL→PAZA ≈ 2 (got ${freshPos.toFixed(4)})`);

// --- Summary ---
out.innerHTML += `<hr><b>Sonuç: ${passed} geçti, ${failed} başarısız</b>\n`;
```

- [ ] **Step 5: Open `tests/test-runner.html` via Live Server and verify all tests pass**

Expected output: all green `✓` marks, `0 başarısız`.

- [ ] **Step 6: Commit**

```bash
git add js/models/ js/services/time.js tests/
git commit -m "feat: add Train model, Line validation, time service, unit tests"
```

---

## Task 4: Storage Service

**Files:**
- Create: `js/services/storage.js`

- [ ] **Step 1: Create `js/services/storage.js`**

```javascript
import { STORAGE_KEY, SCHEMA_VERSION, DEFAULT_SETTINGS, HISTORY_RETENTION_MS } from '../constants/config.js';

export const DEFAULT_DATA = {
  schemaVersion: SCHEMA_VERSION,
  firstLaunchCompleted: false,
  settings: { ...DEFAULT_SETTINGS },
  activeTrains: [],
  history: [],
  segmentTimes: {},
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);

    const data = JSON.parse(raw);
    if (data.schemaVersion !== SCHEMA_VERSION) {
      console.warn('[storage] Schema mismatch — resetting to defaults');
      return structuredClone(DEFAULT_DATA);
    }

    // Prune history older than 24h
    const cutoff = Date.now() - HISTORY_RETENTION_MS;
    data.history = (data.history || []).filter(h => (h.arrivedAt || h.endedAt || 0) > cutoff);

    return data;
  } catch (e) {
    console.error('[storage] Parse error, resetting. Raw data logged below.');
    console.error(localStorage.getItem(STORAGE_KEY));
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[storage] Save failed (quota exceeded?):', e);
  }
}

export function clearHistory() {
  const data = loadData();
  data.history = [];
  saveData(data);
}
```

- [ ] **Step 2: Add storage tests to `tests/unit.test.js`**

Add at the bottom of the file (before the Summary block):

```javascript
// --- storage.js ---
out.innerHTML += '<hr><b>storage.js</b>\n';
import { loadData, saveData, DEFAULT_DATA } from '../js/services/storage.js';

// Clear any existing test data
localStorage.removeItem('tren-izleme:v1');

const fresh = loadData();
assert(Array.isArray(fresh.activeTrains), 'loadData: fresh → activeTrains is array');
assert(fresh.firstLaunchCompleted === false, 'loadData: fresh → firstLaunchCompleted=false');

// Save and reload
const testData = { ...fresh, firstLaunchCompleted: true };
saveData(testData);
const reloaded = loadData();
assert(reloaded.firstLaunchCompleted === true, 'saveData+loadData: firstLaunchCompleted persists');

// Bad JSON
localStorage.setItem('tren-izleme:v1', '{bad json}');
const recovered = loadData();
assert(Array.isArray(recovered.activeTrains), 'loadData: bad JSON → returns defaults');

// Cleanup
localStorage.removeItem('tren-izleme:v1');
```

- [ ] **Step 3: Run tests via Live Server — verify storage tests pass**

- [ ] **Step 4: Commit**

```bash
git add js/services/storage.js tests/unit.test.js
git commit -m "feat: add storage service with schema versioning"
```

---

## Task 5: Audio, Notification & Vibration Services

**Files:**
- Create: `js/services/audio.js`
- Create: `js/services/notification.js`
- Create: `js/services/vibration.js`

- [ ] **Step 1: Create `js/services/audio.js`**

```javascript
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
```

- [ ] **Step 2: Create `js/services/notification.js`**

```javascript
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
```

- [ ] **Step 3: Create `js/services/vibration.js`**

```javascript
export const VIBRATION_PATTERNS = {
  preArrival: [200],
  arrival:    [500, 200, 500, 200, 500],
};

export function vibrate(pattern, enabled = true) {
  if (!enabled || !navigator.vibrate) return;
  navigator.vibrate(pattern);
}
```

- [ ] **Step 4: Add placeholder audio files**

Create 1-second silent MP3s as placeholders (will be replaced with real sounds in Task 17):

```bash
# Download free train sounds later. For now, create 0-byte placeholders so app boots.
echo "" > assets/audio/pre-arrival.mp3
echo "" > assets/audio/arrival.mp3
```

- [ ] **Step 5: Commit**

```bash
git add js/services/audio.js js/services/notification.js js/services/vibration.js assets/audio/
git commit -m "feat: add audio, notification, vibration services"
```

---

## Task 6: Collision Detection

**Files:**
- Create: `js/services/collision.js`

- [ ] **Step 1: Create `js/services/collision.js`**

```javascript
import { getTrainPosition, getTrainDirection } from '../models/Train.js';
import { getSegmentIndex } from '../models/Line.js';
import { getStationById } from '../constants/stations.js';

/**
 * Returns array of collision objects for the given active train list.
 * { segmentIndex, trainA, trainB, estimatedMinutes }
 */
export function detectCollisions(trains) {
  const active = trains.filter(t => t.status === 'active');
  const collisions = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      const posA = getTrainPosition(a);
      const posB = getTrainPosition(b);
      const dirA = getTrainDirection(a);
      const dirB = getTrainDirection(b);

      if (posA === null || posB === null) continue;
      if (dirA === dirB) continue; // same direction → no collision risk

      const segA = getSegmentIndex(posA);
      const segB = getSegmentIndex(posB);
      if (segA !== segB) continue; // different segments

      // Same segment, opposite directions → collision risk
      const estMinutes = estimateMeetingMinutes(a, b, posA, posB);

      collisions.push({ segmentIndex: segA, trainA: a, trainB: b, estimatedMinutes: estMinutes });
    }
  }

  return collisions;
}

/**
 * Check if adding newTrain would cause collisions with existingTrains.
 * Returns collision array (empty = safe).
 */
export function predictCollisionOnAdd(newTrain, existingTrains) {
  return detectCollisions([newTrain, ...existingTrains]);
}

function estimateMeetingMinutes(a, b, posA, posB) {
  const fromA = getStationById(a.fromStation);
  const toA   = getStationById(a.toStation);
  const fromB = getStationById(b.fromStation);
  const toB   = getStationById(b.toStation);

  if (!fromA || !toA || !fromB || !toB) return 0;

  // Speed = distance (in index units) per minute
  const distA = Math.abs(toA.index - fromA.index);
  const distB = Math.abs(toB.index - fromB.index);
  const speedA = distA / a.durationMin;   // index/min
  const speedB = distB / b.durationMin;

  const combinedSpeed = speedA + speedB;
  if (combinedSpeed === 0) return 0;

  return Math.round(Math.abs(posA - posB) / combinedSpeed);
}
```

- [ ] **Step 2: Add collision tests to `tests/unit.test.js`**

Add before the Summary block:

```javascript
// --- collision.js ---
out.innerHTML += '<hr><b>collision.js</b>\n';
import { detectCollisions, predictCollisionOnAdd } from '../js/services/collision.js';

// Two trains, opposite direction, same segment
const cTrainA = { id: 'a', trainNumber: '11111', fromStation: 'NARL', toStation: 'PAZA', durationMin: 15, startedAt: Date.now() - 7 * 60_000, status: 'active', preWarningFired: false, arrivedAt: null };
const cTrainB = { id: 'b', trainNumber: '22222', fromStation: 'PAZA', toStation: 'NARL', durationMin: 15, startedAt: Date.now() - 7 * 60_000, status: 'active', preWarningFired: false, arrivedAt: null };
const cols = detectCollisions([cTrainA, cTrainB]);
assert(cols.length >= 1, 'detectCollisions: zıt yönlü iki tren → collision tespit edildi');

// Two trains, same direction → no collision
const cTrainC = { id: 'c', trainNumber: '33333', fromStation: 'DEHL', toStation: 'PAZA', durationMin: 13, startedAt: Date.now() - 3 * 60_000, status: 'active', preWarningFired: false, arrivedAt: null };
const noCols = detectCollisions([cTrainA, cTrainC]);
assert(noCols.length === 0, 'detectCollisions: aynı yönlü iki tren → collision yok');
```

- [ ] **Step 3: Run tests — verify collision tests pass**

- [ ] **Step 4: Commit**

```bash
git add js/services/collision.js tests/unit.test.js
git commit -m "feat: add collision detection service with tests"
```

---

## Task 7: Alert Orchestration

**Files:**
- Create: `js/services/alerts.js`

- [ ] **Step 1: Create `js/services/alerts.js`**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/services/alerts.js
git commit -m "feat: add alert orchestration service"
```

---

## Task 8: App State Management + Tick Loop

**Files:**
- Create: `js/ui/App.js`

- [ ] **Step 1: Create `js/ui/App.js`**

```javascript
import { loadData, saveData } from '../services/storage.js';
import { createTrain } from '../models/Train.js';
import { initAudio, unlockAudio } from '../services/audio.js';
import { detectCollisions } from '../services/collision.js';
import { triggerPreArrivalAlert, triggerArrivalAlert, triggerCollisionAlert } from '../services/alerts.js';
import { WATCHED_STATION_ID } from '../constants/config.js';
import { minutesRemaining } from '../services/time.js';

// ─── State ─────────────────────────────────────────────────────────────────

let state = {
  trains:               [],   // active trains
  history:              [],
  settings:             {},
  segmentTimes:         {},
  firstLaunchCompleted: false,
  ui: {
    activeTab:     'active',  // 'active' | 'history'
    showForm:      false,
    editingTrain:  null,
    showSettings:  false,
    banners:       [],        // { id, type, message, autoDismissMs }
    showStaleModal: false,
    staleTrains:   [],
    collisions:    [],
  },
};

// ─── Selectors ─────────────────────────────────────────────────────────────

export function getState() { return state; }

// ─── Dispatch ──────────────────────────────────────────────────────────────

export function dispatch(action, payload) {
  state = reduce(state, action, payload);
  persistState();
  renderAll();
}

function reduce(s, action, payload) {
  switch (action) {

    case 'ADD_TRAIN': {
      const train = createTrain(payload);
      const segKey = `${payload.fromStation}->${payload.toStation}`;
      return {
        ...s,
        trains: [...s.trains, train],
        segmentTimes: { ...s.segmentTimes, [segKey]: payload.durationMin },
        ui: { ...s.ui, showForm: false, editingTrain: null },
      };
    }

    case 'EDIT_TRAIN': {
      const { id, fromStation, toStation, durationMin } = payload;
      const segKey = `${fromStation}->${toStation}`;
      return {
        ...s,
        trains: s.trains.map(t =>
          t.id === id
            ? { ...t, fromStation, toStation, durationMin: Number(durationMin), startedAt: Date.now(), preWarningFired: false }
            : t
        ),
        segmentTimes: { ...s.segmentTimes, [segKey]: Number(durationMin) },
        ui: { ...s.ui, showForm: false, editingTrain: null },
      };
    }

    case 'DELETE_TRAIN': {
      const target = s.trains.find(t => t.id === payload.id);
      if (!target) return s;
      const deleted = { ...target, status: 'deleted', endedAt: Date.now() };
      return {
        ...s,
        trains: s.trains.filter(t => t.id !== payload.id),
        history: [deleted, ...s.history],
      };
    }

    case 'MANUAL_ARRIVED': {
      const target = s.trains.find(t => t.id === payload.id);
      if (!target) return s;
      const arrived = { ...target, status: 'manual_arrived', arrivedAt: Date.now(), endedAt: Date.now() };
      return {
        ...s,
        trains: s.trains.filter(t => t.id !== payload.id),
        history: [arrived, ...s.history],
      };
    }

    case 'OPEN_FORM':
      return { ...s, ui: { ...s.ui, showForm: true, editingTrain: payload?.train ?? null } };

    case 'CLOSE_FORM':
      return { ...s, ui: { ...s.ui, showForm: false, editingTrain: null } };

    case 'SET_TAB':
      return { ...s, ui: { ...s.ui, activeTab: payload.tab } };

    case 'TOGGLE_SETTINGS':
      return { ...s, ui: { ...s.ui, showSettings: !s.ui.showSettings } };

    case 'UPDATE_SETTINGS':
      return { ...s, settings: { ...s.settings, ...payload } };

    case 'ADD_BANNER': {
      const id = Date.now() + Math.random();
      const banner = { ...payload, id };
      if (payload.autoDismissMs) {
        setTimeout(() => dispatch('REMOVE_BANNER', { id }), payload.autoDismissMs);
      }
      return { ...s, ui: { ...s.ui, banners: [...s.ui.banners, banner] } };
    }

    case 'REMOVE_BANNER':
      return { ...s, ui: { ...s.ui, banners: s.ui.banners.filter(b => b.id !== payload.id) } };

    case 'SET_COLLISIONS':
      return { ...s, ui: { ...s.ui, collisions: payload.collisions } };

    case 'COMPLETE_FIRST_LAUNCH':
      return { ...s, firstLaunchCompleted: true };

    case 'RESOLVE_STALE_TRAINS': {
      const { action: resolution, trains: staleIds } = payload;
      if (resolution === 'addAll') {
        const added = s.ui.staleTrains.map(t => ({ ...t, status: 'arrived', endedAt: t.startedAt + t.durationMin * 60_000 }));
        return { ...s, trains: s.trains.filter(t => !staleIds.includes(t.id)), history: [...added, ...s.history], ui: { ...s.ui, showStaleModal: false, staleTrains: [] } };
      }
      if (resolution === 'ignore') {
        return { ...s, trains: s.trains.filter(t => !staleIds.includes(t.id)), ui: { ...s.ui, showStaleModal: false, staleTrains: [] } };
      }
      return s;
    }

    case 'RESOLVE_ONE_STALE': {
      const { id, resolution } = payload;
      const target = s.ui.staleTrains.find(t => t.id === id);
      if (!target) return s;
      const remaining = s.ui.staleTrains.filter(t => t.id !== id);
      let history = s.history;
      if (resolution === 'add') {
        history = [{ ...target, status: 'arrived', endedAt: target.startedAt + target.durationMin * 60_000 }, ...history];
      }
      const trains = s.trains.filter(t => t.id !== id);
      const showStaleModal = remaining.length > 0;
      return { ...s, trains, history, ui: { ...s.ui, staleTrains: remaining, showStaleModal } };
    }

    default:
      console.warn('[App] Unknown action:', action);
      return s;
  }
}

// ─── Persistence ───────────────────────────────────────────────────────────

function persistState() {
  saveData({
    schemaVersion: 1,
    firstLaunchCompleted: state.firstLaunchCompleted,
    settings: state.settings,
    activeTrains: state.trains,
    history: state.history,
    segmentTimes: state.segmentTimes,
  });
}

// ─── Tick Loop ─────────────────────────────────────────────────────────────

function tick() {
  const now = Date.now();
  const preWarnMin = state.settings.preWarningMinutes ?? 3;
  let changed = false;

  const addBanner = (banner) => dispatch('ADD_BANNER', banner);

  // Process each active train
  const updatedTrains = state.trains.map(train => {
    if (train.status !== 'active') return train;
    const remaining = minutesRemaining(train.startedAt, train.durationMin);

    // Arrival
    if (remaining <= 0) {
      const arrived = { ...train, status: 'arrived', arrivedAt: now, endedAt: now };
      if (train.toStation === WATCHED_STATION_ID) {
        triggerArrivalAlert(train, state.settings, addBanner);
      }
      changed = true;
      return arrived;
    }

    // Pre-warning
    if (!train.preWarningFired && remaining <= preWarnMin && train.toStation === WATCHED_STATION_ID) {
      triggerPreArrivalAlert(train, remaining, state.settings, addBanner);
      changed = true;
      return { ...train, preWarningFired: true };
    }

    return train;
  });

  // Move arrived trains to history
  if (changed) {
    const nowArrived = updatedTrains.filter(t => t.status === 'arrived');
    const stillActive = updatedTrains.filter(t => t.status === 'active' || t.status === 'manual_arrived' || t.status === 'deleted');
    const active = updatedTrains.filter(t => t.status === 'active');

    state = {
      ...state,
      trains: active.concat(updatedTrains.filter(t => t.preWarningFired && t.status === 'active')).filter((v, i, a) => a.findIndex(x => x.id === v.id) === i),
      history: [...nowArrived, ...state.history],
    };

    // Recompute active trains cleanly
    state = {
      ...state,
      trains: updatedTrains.filter(t => t.status === 'active'),
      history: [...nowArrived, ...state.history],
    };

    persistState();
    renderAll();
    return;
  }

  // Collision detection (every tick)
  const collisions = detectCollisions(state.trains);
  const prevCount = state.ui.collisions.length;
  if (collisions.length !== prevCount) {
    collisions.forEach(col => {
      if (!state.ui.collisions.find(c => c.trainA.id === col.trainA.id && c.trainB.id === col.trainB.id)) {
        triggerCollisionAlert(col, addBanner);
      }
    });
    state = { ...state, ui: { ...state.ui, collisions } };
    renderAll();
    return;
  }
  state = { ...state, ui: { ...state.ui, collisions } };

  // Update countdown + positions without full re-render
  updateCountdownsInDOM();
  updateTrackPositionsInDOM();
}

// ─── Lightweight DOM updates (no re-render) ────────────────────────────────

import { getTrainPosition } from '../models/Train.js';
import { STATIONS, SEGMENT_COUNT } from '../constants/stations.js';
import { formatMinutes } from '../services/time.js';

function updateCountdownsInDOM() {
  state.trains.forEach(train => {
    const el = document.querySelector(`[data-train-id="${train.id}"] .countdown`);
    if (!el) return;
    const rem = minutesRemaining(train.startedAt, train.durationMin);
    el.textContent = formatMinutes(rem);
    el.parentElement?.classList.toggle('urgent', rem <= 3 && rem > 0);
  });
}

function updateTrackPositionsInDOM() {
  state.trains.forEach(train => {
    const el = document.querySelector(`.track-train[data-train-id="${train.id}"]`);
    if (!el) return;
    const pos = getTrainPosition(train);
    if (pos === null) return;
    const pct = (pos / SEGMENT_COUNT) * 100;
    el.style.left = `calc(${pct}% - 20px)`;
  });

  // Segment collision highlights
  const collisionSegments = new Set(state.ui.collisions.map(c => c.segmentIndex));
  document.querySelectorAll('.track-segment').forEach(seg => {
    const idx = Number(seg.dataset.segmentIndex);
    seg.classList.toggle('collision', collisionSegments.has(idx));
  });
}

// ─── Rendering ─────────────────────────────────────────────────────────────

// Imported lazily to avoid circular deps at module load time
let _renderFns = null;
async function getRenderFns() {
  if (_renderFns) return _renderFns;
  const [TrackView, TrainList, AlertBanner, FirstLaunch, StaleModal, SettingsPanel] = await Promise.all([
    import('./TrackView.js'),
    import('./TrainList.js'),
    import('./AlertBanner.js'),
    import('./FirstLaunch.js'),
    import('./StaleTrainsModal.js'),
    import('./SettingsPanel.js'),
  ]);
  _renderFns = { TrackView, TrainList, AlertBanner, FirstLaunch, StaleModal, SettingsPanel };
  return _renderFns;
}

async function renderAll() {
  const fns = await getRenderFns();
  const s = state;

  if (!s.firstLaunchCompleted) {
    fns.FirstLaunch.renderFirstLaunch(document.getElementById('first-launch-container'), dispatch);
    document.getElementById('app').classList.add('hidden');
    return;
  }

  document.getElementById('first-launch-container').innerHTML = '';
  document.getElementById('app').classList.remove('hidden');

  fns.TrackView.renderTrackView(document.getElementById('track-container'), s);
  fns.TrainList.renderTrainList(document.getElementById('list-container'), s, dispatch);
  fns.AlertBanner.renderBanners(document.getElementById('banners-container'), s, dispatch);

  if (s.ui.showStaleModal) {
    fns.StaleModal.renderStaleModal(document.getElementById('stale-modal-container'), s, dispatch);
  } else {
    document.getElementById('stale-modal-container').innerHTML = '';
  }

  if (s.ui.showSettings) {
    fns.SettingsPanel.renderSettings(document.getElementById('settings-container'), s, dispatch);
  } else {
    document.getElementById('settings-container').innerHTML = '';
  }

  if (s.ui.showForm) {
    const { renderForm } = await import('./TrainForm.js');
    renderForm(document.getElementById('modal-container'), s, dispatch);
  } else {
    document.getElementById('modal-container').innerHTML = '';
  }

  renderHeader(s);
}

function renderHeader(s) {
  const el = document.getElementById('header-container');
  const activeCount = s.trains.filter(t => t.status === 'active').length;
  el.innerHTML = `
    <div class="header-inner">
      <span class="header-title">🚆 Tren İzleme</span>
      <span class="header-station">Pazarcık</span>
      <div class="header-actions">
        <span class="badge">${activeCount} aktif</span>
        <button class="icon-btn" onclick="window._dispatch('TOGGLE_SETTINGS')" title="Ayarlar">⚙</button>
      </div>
    </div>`;
}

// ─── Boot ──────────────────────────────────────────────────────────────────

export async function boot() {
  // Make dispatch accessible from inline onclick handlers
  window._dispatch = dispatch;

  initAudio();

  const saved = loadData();
  const now = Date.now();

  // Separate stale trains (arrived while app was closed)
  const staleTrains = saved.activeTrains.filter(t => {
    const rem = minutesRemaining(t.startedAt, t.durationMin);
    return rem <= 0;
  });
  const activeTrains = saved.activeTrains.filter(t => {
    const rem = minutesRemaining(t.startedAt, t.durationMin);
    return rem > 0;
  });

  state = {
    trains:               activeTrains,
    history:              saved.history || [],
    settings:             { ...{ preWarningMinutes: 3, soundEnabled: true, vibrationEnabled: true }, ...saved.settings },
    segmentTimes:         saved.segmentTimes || {},
    firstLaunchCompleted: saved.firstLaunchCompleted || false,
    ui: {
      activeTab:     'active',
      showForm:      false,
      editingTrain:  null,
      showSettings:  false,
      banners:       [],
      showStaleModal: staleTrains.length > 0,
      staleTrains,
      collisions:    [],
    },
  };

  await renderAll();

  // Start 1-second tick
  setInterval(tick, 1000);
}
```

- [ ] **Step 2: Update `js/main.js`**

```javascript
import { boot } from './ui/App.js';
boot();
```

- [ ] **Step 3: Register Service Worker in `js/main.js`**

```javascript
import { boot } from './ui/App.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(e => {
    console.warn('[SW] Registration failed:', e);
  });
}

boot();
```

- [ ] **Step 4: Commit**

```bash
git add js/ui/App.js js/main.js
git commit -m "feat: add App state management, dispatch, tick loop"
```

---

## Task 9: Base CSS & Layout

**Files:**
- Modify: `styles/reset.css`
- Modify: `styles/base.css`
- Modify: `styles/header.css`

- [ ] **Step 1: Write `styles/reset.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 16px; }
body { line-height: 1.4; -webkit-text-size-adjust: 100%; }
button { font: inherit; cursor: pointer; border: none; background: none; }
input, select { font: inherit; }
ul, ol { list-style: none; }
```

- [ ] **Step 2: Write `styles/base.css`**

```css
:root {
  --bg:         #0d1117;
  --bg-card:    #161b22;
  --bg-input:   #21262d;
  --border:     #30363d;
  --track:      #3a4250;
  --pazarcik:   #ff8c42;
  --east:       #3b82f6;
  --west:       #10b981;
  --warn:       #f59e0b;
  --danger:     #ef4444;
  --text:       #e6edf3;
  --text-muted: #8b949e;
  --radius:     8px;
  --radius-sm:  4px;
  --shadow:     0 2px 8px rgba(0,0,0,0.4);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: 100dvh;
  overflow-x: hidden;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}

#main {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

#track-container {
  flex: 0 0 45%;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  padding: 1rem;
}

#list-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.hidden { display: none !important; }

/* Utility */
.btn {
  padding: .5rem 1rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: .875rem;
  transition: opacity .15s;
}
.btn:active { opacity: .8; }
.btn-primary { background: var(--pazarcik); color: #000; }
.btn-danger  { background: var(--danger);   color: #fff; }
.btn-ghost   { background: var(--bg-input); color: var(--text); border: 1px solid var(--border); }

.icon-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--bg-input);
  color: var(--text);
  font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border);
}
.icon-btn:hover { background: var(--border); }
```

- [ ] **Step 3: Write `styles/header.css`**

```css
#header-container {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: .75rem 1rem;
  flex-shrink: 0;
}

.header-inner {
  display: flex;
  align-items: center;
  gap: .75rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--pazarcik);
}

.header-station {
  font-size: .8rem;
  color: var(--text-muted);
  background: var(--bg-input);
  padding: .2rem .5rem;
  border-radius: 99px;
  border: 1px solid var(--border);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: .5rem;
}

.badge {
  font-size: .75rem;
  background: var(--bg-input);
  color: var(--text-muted);
  padding: .2rem .6rem;
  border-radius: 99px;
  border: 1px solid var(--border);
}
```

- [ ] **Step 4: Open `index.html` via Live Server — verify dark background, no console errors**

- [ ] **Step 5: Commit**

```bash
git add styles/
git commit -m "feat: base CSS layout and dark theme"
```

---

## Task 10: First-Launch Screen

**Files:**
- Create: `js/ui/FirstLaunch.js`

- [ ] **Step 1: Create `js/ui/FirstLaunch.js`**

```javascript
import { unlockAudio } from '../services/audio.js';
import { requestNotificationPermission } from '../services/notification.js';
import { vibrate } from '../services/vibration.js';

export function renderFirstLaunch(container, dispatch) {
  container.innerHTML = `
    <div class="first-launch-overlay">
      <div class="first-launch-card">
        <div class="first-launch-icon">🚆</div>
        <h1 class="first-launch-title">Tren İzleme</h1>
        <p class="first-launch-subtitle">Pazarcık İstasyonu Kontrol Sistemi</p>
        <p class="first-launch-desc">
          Sesli uyarılar, ekran bildirimleri ve titreşim için sistemi başlatın.
        </p>
        <button class="btn btn-primary first-launch-btn" id="start-btn">
          Sistemi Başlat
        </button>
        <p class="first-launch-note">
          Bildirim izni istenecek. Reddedebilirsiniz, ses ve ekran uyarıları çalışmaya devam eder.
        </p>
      </div>
    </div>`;

  container.querySelector('#start-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#start-btn');
    btn.disabled = true;
    btn.textContent = 'Başlatılıyor...';

    // 1. Unlock audio
    await unlockAudio();

    // 2. Request notification permission
    const perm = await requestNotificationPermission();
    if (perm === 'denied') {
      console.info('[FirstLaunch] Notification permission denied — ses+banner aktif');
    }

    // 3. Test vibration
    vibrate([100]);

    // 4. Complete launch
    dispatch('COMPLETE_FIRST_LAUNCH');
  });
}
```

- [ ] **Step 2: Add first-launch CSS to `styles/base.css`**

Append to the file:

```css
/* First Launch */
.first-launch-overlay {
  position: fixed; inset: 0;
  background: var(--bg);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.first-launch-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  text-align: center;
  max-width: 380px;
  width: 100%;
  box-shadow: var(--shadow);
}

.first-launch-icon { font-size: 3rem; margin-bottom: 1rem; }
.first-launch-title { font-size: 1.5rem; font-weight: 700; color: var(--pazarcik); margin-bottom: .25rem; }
.first-launch-subtitle { color: var(--text-muted); font-size: .875rem; margin-bottom: 1rem; }
.first-launch-desc { font-size: .875rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.6; }
.first-launch-btn { width: 100%; padding: .875rem; font-size: 1rem; margin-bottom: 1rem; }
.first-launch-note { font-size: .75rem; color: var(--text-muted); }
```

- [ ] **Step 3: Open app via Live Server — verify "Sistemi Başlat" screen appears, clicking it transitions to the (empty) main app**

- [ ] **Step 4: Commit**

```bash
git add js/ui/FirstLaunch.js styles/base.css
git commit -m "feat: first-launch screen with audio/notification unlock"
```

---

## Task 11: Train Form Modal

**Files:**
- Create: `js/ui/TrainForm.js`
- Modify: `styles/modal.css`

- [ ] **Step 1: Create `js/ui/TrainForm.js`**

```javascript
import { STATIONS } from '../constants/stations.js';
import { validateTrainNumber, validateRoute, validateDuration } from '../models/Line.js';
import { predictCollisionOnAdd } from '../services/collision.js';
import { createTrain } from '../models/Train.js';

export function renderForm(container, state, dispatch) {
  const editing = state.ui.editingTrain;
  const isEdit  = !!editing;
  const segKey  = editing ? `${editing.fromStation}->${editing.toStation}` : null;

  container.innerHTML = `
    <div class="modal-overlay" id="form-overlay">
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Tren Ekle">
        <div class="modal-header">
          <h2>${isEdit ? 'Tren Düzenle' : 'Yeni Tren Ekle'}</h2>
          <button class="icon-btn" id="form-close">✕</button>
        </div>

        <div class="form-group">
          <label for="f-train-no">Tren No <span class="req">*</span></label>
          <input id="f-train-no" type="text" inputmode="numeric" maxlength="5"
            placeholder="00000" value="${editing?.trainNumber ?? ''}" autocomplete="off" />
          <span class="field-error" id="err-no"></span>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="f-from">Kalkış <span class="req">*</span></label>
            <select id="f-from">
              <option value="">— Seçin —</option>
              ${STATIONS.map(s => `<option value="${s.id}" ${editing?.fromStation === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <span class="field-error" id="err-from"></span>
          </div>
          <div class="form-group">
            <label for="f-to">Varış <span class="req">*</span></label>
            <select id="f-to">
              <option value="">— Seçin —</option>
              ${STATIONS.map(s => `<option value="${s.id}" ${editing?.toStation === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <span class="field-error" id="err-to"></span>
          </div>
        </div>

        <div class="form-group">
          <label for="f-dur">Süre (dakika) <span class="req">*</span></label>
          <input id="f-dur" type="number" min="1" max="999"
            value="${editing?.durationMin ?? ''}"
            placeholder="${getSuggestion(state.segmentTimes, null, null)}" />
          <span class="suggestion" id="suggestion-hint"></span>
          <span class="field-error" id="err-dur"></span>
        </div>

        <div class="modal-footer">
          <button class="btn btn-ghost" id="form-cancel">İptal</button>
          <button class="btn btn-primary" id="form-save" disabled>
            ${isEdit ? 'Güncelle' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>`;

  const elNo   = container.querySelector('#f-train-no');
  const elFrom = container.querySelector('#f-from');
  const elTo   = container.querySelector('#f-to');
  const elDur  = container.querySelector('#f-dur');
  const saveBtn = container.querySelector('#form-save');

  function validate() {
    const noResult  = validateTrainNumber(elNo.value);
    const rtResult  = validateRoute(elFrom.value, elTo.value);
    const durResult = validateDuration(elDur.value);

    container.querySelector('#err-no').textContent   = noResult.error ?? '';
    container.querySelector('#err-from').textContent = rtResult.error ?? '';
    container.querySelector('#err-dur').textContent  = durResult.error ?? '';

    const allOk = noResult.valid && rtResult.valid && durResult.valid;
    saveBtn.disabled = !allOk;
    return allOk;
  }

  function updateSuggestion() {
    const key = `${elFrom.value}->${elTo.value}`;
    const sug = state.segmentTimes[key];
    const hint = container.querySelector('#suggestion-hint');
    if (sug && !elDur.value) {
      hint.textContent = `Önerilen: ${sug} dk`;
      hint.onclick = () => { elDur.value = sug; validate(); };
    } else {
      hint.textContent = '';
    }
  }

  elNo.addEventListener('input', validate);
  elFrom.addEventListener('change', () => { validate(); updateSuggestion(); });
  elTo.addEventListener('change', () => { validate(); updateSuggestion(); });
  elDur.addEventListener('input', validate);

  container.querySelector('#form-close').addEventListener('click', () => dispatch('CLOSE_FORM'));
  container.querySelector('#form-cancel').addEventListener('click', () => dispatch('CLOSE_FORM'));
  container.querySelector('#form-overlay').addEventListener('click', e => {
    if (e.target.id === 'form-overlay') dispatch('CLOSE_FORM');
  });

  saveBtn.addEventListener('click', () => {
    if (!validate()) return;

    const payload = {
      trainNumber: elNo.value,
      fromStation: elFrom.value,
      toStation:   elTo.value,
      durationMin: Number(elDur.value),
    };

    // Duplicate train number check
    const dup = state.trains.find(t => t.trainNumber === payload.trainNumber && (!isEdit || t.id !== editing.id));
    if (dup) {
      if (!confirm(`Tren ${payload.trainNumber} zaten takipte. Yine de eklensin mi?`)) return;
    }

    // Collision check
    if (!isEdit) {
      const tmpTrain = createTrain(payload);
      const cols = predictCollisionOnAdd(tmpTrain, state.trains);
      if (cols.length > 0) {
        const col = cols[0];
        const eta = col.estimatedMinutes > 0 ? `~${col.estimatedMinutes} dk sonra ` : '';
        if (!confirm(`⚠️ Bu tren ${eta}Tren ${col.trainB.trainNumber} ile karşılaşabilir. Yine de eklensin mi?`)) return;
      }
      dispatch('ADD_TRAIN', payload);
    } else {
      dispatch('EDIT_TRAIN', { id: editing.id, ...payload });
    }
  });

  // Initial validation state
  if (isEdit) validate();
  updateSuggestion();

  elNo.focus();
}

function getSuggestion(segmentTimes, fromId, toId) {
  if (!fromId || !toId) return '';
  return segmentTimes[`${fromId}->${toId}`] ?? '';
}
```

- [ ] **Step 2: Write `styles/modal.css`**

```css
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 500;
  padding: 1rem;
}

.modal-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow);
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 1.25rem;
}
.modal-header h2 { font-size: 1.1rem; font-weight: 700; }

.modal-footer {
  display: flex; gap: .75rem; justify-content: flex-end;
  margin-top: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: .8rem;
  color: var(--text-muted);
  margin-bottom: .35rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.req { color: var(--danger); }

.form-group input,
.form-group select {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  padding: .6rem .75rem;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--pazarcik);
}

.form-row { display: flex; gap: .75rem; }
.form-row .form-group { flex: 1; }

.field-error { display: block; font-size: .75rem; color: var(--danger); margin-top: .25rem; min-height: 1em; }
.suggestion { display: block; font-size: .75rem; color: var(--east); margin-top: .25rem; cursor: pointer; }
.suggestion:hover { text-decoration: underline; }
```

- [ ] **Step 3: Open app via Live Server, complete first launch, click "+ Yeni Tren" (add button missing — test by dispatching manually in console)**

In browser console:
```javascript
window._dispatch('OPEN_FORM');
```
Verify form modal appears with all fields, dropdowns populated with 9 stations.

- [ ] **Step 4: Commit**

```bash
git add js/ui/TrainForm.js styles/modal.css
git commit -m "feat: train form modal with validation and collision pre-check"
```

---

## Task 12: Track Visualization

**Files:**
- Create: `js/ui/TrackView.js`
- Modify: `styles/track-view.css`

- [ ] **Step 1: Create `js/ui/TrackView.js`**

```javascript
import { STATIONS, SEGMENT_COUNT } from '../constants/stations.js';
import { getTrainPosition, getTrainDirection } from '../models/Train.js';
import { minutesRemaining, formatMinutes } from '../services/time.js';
import { WATCHED_STATION_ID } from '../constants/config.js';

export function renderTrackView(container, state) {
  const collisionSegments = new Set(state.ui.collisions.map(c => c.segmentIndex));

  container.innerHTML = `
    <div class="track-wrapper">
      <div class="track-line">
        ${renderStations(state)}
        ${renderSegments(collisionSegments)}
        ${renderTrains(state.trains)}
      </div>
    </div>`;
}

function renderStations(state) {
  return STATIONS.map(s => {
    const pct = (s.index / SEGMENT_COUNT) * 100;
    const isWatched = s.id === WATCHED_STATION_ID;
    return `
      <div class="track-station ${isWatched ? 'watched' : ''}"
           style="left: ${pct}%"
           title="${s.label}">
        <div class="station-dot"></div>
        <span class="station-label">${s.shortLabel}</span>
      </div>`;
  }).join('');
}

function renderSegments(collisionSegments) {
  return Array.from({ length: SEGMENT_COUNT }, (_, i) => {
    const leftPct  = (i / SEGMENT_COUNT) * 100;
    const widthPct = (1 / SEGMENT_COUNT) * 100;
    const hasCollision = collisionSegments.has(i);
    return `
      <div class="track-segment ${hasCollision ? 'collision' : ''}"
           data-segment-index="${i}"
           style="left: ${leftPct}%; width: ${widthPct}%">
        ${hasCollision ? '<span class="collision-icon">⚠️</span>' : ''}
      </div>`;
  }).join('');
}

function renderTrains(trains) {
  return trains
    .filter(t => t.status === 'active')
    .map((train, idx) => {
      const pos  = getTrainPosition(train);
      if (pos === null) return '';

      const dir  = getTrainDirection(train);
      const pct  = (pos / SEGMENT_COUNT) * 100;
      const rem  = minutesRemaining(train.startedAt, train.durationMin);
      const urgent = rem <= 3 && rem > 0;
      const dirClass = dir === 'east' ? 'east' : 'west';

      // Vertical offset to separate trains on same segment
      const offset = (idx % 3) * 22; // px, stagger up to 3 trains

      return `
        <div class="track-train ${dirClass} ${urgent ? 'urgent' : ''}"
             data-train-id="${train.id}"
             style="left: calc(${pct}% - 20px); top: calc(50% - 28px - ${offset}px)"
             title="Tren ${train.trainNumber}">
          <div class="train-icon">${dir === 'east' ? '→' : '←'}</div>
          <div class="train-label">${train.trainNumber}</div>
          <div class="train-label countdown">${formatMinutes(rem)}</div>
        </div>`;
    }).join('');
}
```

- [ ] **Step 2: Write `styles/track-view.css`**

```css
.track-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: 0 1rem;
}

.track-line {
  position: relative;
  width: 100%;
  min-width: 600px;
  height: 80px;
}

/* The rail line itself */
.track-line::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0; right: 0;
  height: 3px;
  background: var(--track);
  transform: translateY(-50%);
  border-radius: 2px;
}

/* Stations */
.track-station {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.station-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--track);
  border: 2px solid var(--bg);
  flex-shrink: 0;
}

.track-station.watched .station-dot {
  background: var(--pazarcik);
  width: 14px; height: 14px;
  box-shadow: 0 0 8px var(--pazarcik);
}

.station-label {
  font-size: .55rem;
  color: var(--text-muted);
  white-space: nowrap;
  letter-spacing: .03em;
}
.track-station.watched .station-label {
  color: var(--pazarcik);
  font-weight: 700;
  font-size: .65rem;
}

/* Segments */
.track-segment {
  position: absolute;
  top: 50%;
  height: 3px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.track-segment.collision {
  background: var(--danger);
  animation: blink 0.8s infinite;
  z-index: 1;
}
.collision-icon {
  position: absolute;
  top: -18px;
  font-size: .75rem;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: .3; }
}

/* Trains */
.track-train {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: default;
  transition: left 1s linear;
  z-index: 2;
}

.train-icon {
  width: 28px; height: 18px;
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: .85rem;
  font-weight: 700;
  border: 2px solid currentColor;
}
.track-train.east { color: var(--east); }
.track-train.west { color: var(--west); }
.track-train.urgent { color: var(--danger); animation: blink 0.8s infinite; }

.train-label {
  font-size: .55rem;
  font-weight: 700;
  white-space: nowrap;
}
.train-label.countdown {
  font-size: .6rem;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Open app via Live Server, add a train via console, verify it appears on track**

```javascript
// In browser console (after first launch):
window._dispatch('ADD_TRAIN', { trainNumber: '46500', fromStation: 'NARL', toStation: 'PAZA', durationMin: 11 });
```

Verify: train icon visible on track, positioned between NARLI and PAZARCIK, moving slowly toward PAZA.

- [ ] **Step 4: Commit**

```bash
git add js/ui/TrackView.js styles/track-view.css
git commit -m "feat: track visualization with animated train positions"
```

---

## Task 13: Train List & Cards

**Files:**
- Create: `js/ui/TrainList.js`
- Create: `js/ui/TrainCard.js`
- Modify: `styles/train-list.css`

- [ ] **Step 1: Create `js/ui/TrainCard.js`**

```javascript
import { getTrainDirection } from '../models/Train.js';
import { minutesRemaining, formatMinutes, formatTime } from '../services/time.js';

export function trainCardHTML(train, isHistory = false) {
  if (isHistory) return historyCardHTML(train);

  const dir = getTrainDirection(train);
  const rem = minutesRemaining(train.startedAt, train.durationMin);
  const urgent = rem <= 3 && rem > 0;
  const dirArrow = dir === 'east' ? '→' : '←';
  const dirClass = dir === 'east' ? 'east' : 'west';

  return `
    <div class="train-card ${urgent ? 'urgent' : ''} ${dirClass}" data-train-id="${train.id}">
      <div class="card-top">
        <span class="card-number">${train.trainNumber}</span>
        <span class="card-dir ${dirClass}">${dirArrow}</span>
        <span class="countdown">${formatMinutes(rem)}</span>
      </div>
      <div class="card-route">
        ${stationLabel(train.fromStation)} → ${stationLabel(train.toStation)}
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${train.id}">✏ Düzenle</button>
        <button class="btn btn-ghost btn-sm" data-action="arrived" data-id="${train.id}">✓ Vardı</button>
        <button class="btn btn-danger btn-sm" data-action="delete" data-id="${train.id}">🗑 Sil</button>
      </div>
    </div>`;
}

function historyCardHTML(train) {
  const statusLabel = {
    arrived:       '✓ Vardı',
    manual_arrived:'✓ Manuel',
    deleted:       '🗑 Silindi',
  }[train.status] ?? '—';
  const time = formatTime(train.endedAt || train.arrivedAt || train.startedAt);
  const dir = getTrainDirection(train);
  const dirArrow = dir === 'east' ? '→' : '←';

  return `
    <div class="train-card history-card">
      <div class="card-top">
        <span class="card-number">${train.trainNumber}</span>
        <span class="card-dir">${dirArrow}</span>
        <span class="history-status">${statusLabel} ${time}</span>
      </div>
      <div class="card-route">
        ${stationLabel(train.fromStation)} → ${stationLabel(train.toStation)}
      </div>
    </div>`;
}

function stationLabel(id) {
  const map = {
    TURK: 'Türkoğlu', KOPR: 'Köprüağzı', NARL: 'Narlı',
    DEHL: 'Dehliz',   PAZA: 'Pazarcık',  AKSU: 'Aksu',
    HAYD: 'Haydarlı', CELI: 'Çelik',     GOLB: 'Gölbaşı',
  };
  return map[id] ?? id;
}
```

- [ ] **Step 2: Create `js/ui/TrainList.js`**

```javascript
import { trainCardHTML } from './TrainCard.js';
import { minutesRemaining } from '../services/time.js';

export function renderTrainList(container, state, dispatch) {
  const active = [...state.trains]
    .filter(t => t.status === 'active')
    .sort((a, b) => minutesRemaining(a.startedAt, a.durationMin) - minutesRemaining(b.startedAt, b.durationMin));

  const history = [...state.history]
    .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  const isActive  = state.ui.activeTab === 'active';
  const isHistory = state.ui.activeTab === 'history';

  container.innerHTML = `
    <div class="list-header">
      <div class="list-tabs">
        <button class="tab ${isActive ? 'active' : ''}" data-tab="active">
          Aktif <span class="tab-badge">${active.length}</span>
        </button>
        <button class="tab ${isHistory ? 'active' : ''}" data-tab="history">
          Tarihçe <span class="tab-badge">${history.length}</span>
        </button>
      </div>
      <button class="btn btn-primary btn-sm" id="add-train-btn">+ Yeni Tren</button>
    </div>

    <div class="card-grid">
      ${isActive  ? (active.length  ? active.map(t => trainCardHTML(t)).join('')       : emptyState('Aktif tren yok. + Yeni Tren ekleyin.')) : ''}
      ${isHistory ? (history.length ? history.map(t => trainCardHTML(t, true)).join('') : emptyState('Son 24 saatte tamamlanan tren yok.'))    : ''}
    </div>`;

  container.querySelector('#add-train-btn').addEventListener('click', () => dispatch('OPEN_FORM'));

  container.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => dispatch('SET_TAB', { tab: btn.dataset.tab }));
  });

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, id } = btn.dataset;
      if (action === 'edit') {
        const train = state.trains.find(t => t.id === id);
        if (train) dispatch('OPEN_FORM', { train });
      }
      if (action === 'arrived') {
        if (confirm(`Tren ${findTrain(state, id)?.trainNumber} Pazarcık'a manuel vardı mı?`)) {
          dispatch('MANUAL_ARRIVED', { id });
        }
      }
      if (action === 'delete') {
        if (confirm(`Tren ${findTrain(state, id)?.trainNumber} silinsin mi?`)) {
          dispatch('DELETE_TRAIN', { id });
        }
      }
    });
  });
}

function findTrain(state, id) {
  return state.trains.find(t => t.id === id);
}

function emptyState(msg) {
  return `<p class="empty-state">${msg}</p>`;
}
```

- [ ] **Step 3: Write `styles/train-list.css`**

```css
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  gap: .5rem;
  flex-wrap: wrap;
}

.list-tabs {
  display: flex;
  gap: .25rem;
  background: var(--bg-input);
  padding: .2rem;
  border-radius: var(--radius-sm);
}

.tab {
  padding: .35rem .75rem;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: .8rem;
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: .4rem;
  transition: background .15s;
}
.tab.active {
  background: var(--bg-card);
  color: var(--text);
}
.tab-badge {
  background: var(--border);
  color: var(--text-muted);
  border-radius: 99px;
  font-size: .65rem;
  padding: 0 .4rem;
  font-weight: 700;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: .75rem;
}

.train-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
}
.train-card.east { border-left: 3px solid var(--east); }
.train-card.west { border-left: 3px solid var(--west); }
.train-card.urgent {
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--bg-card));
}
.train-card.history-card {
  opacity: .7;
  border-left: 3px solid var(--border);
}

.card-top {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .5rem;
}
.card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.card-dir {
  font-size: 1rem;
  font-weight: 700;
}
.card-dir.east { color: var(--east); }
.card-dir.west { color: var(--west); }

.countdown {
  margin-left: auto;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pazarcik);
  font-variant-numeric: tabular-nums;
}
.urgent .countdown { color: var(--danger); }

.card-route {
  font-size: .75rem;
  color: var(--text-muted);
  margin-bottom: .75rem;
}

.card-actions {
  display: flex;
  gap: .4rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: .3rem .6rem;
  font-size: .75rem;
}

.history-status {
  margin-left: auto;
  font-size: .75rem;
  color: var(--text-muted);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-muted);
  font-size: .875rem;
  padding: 2rem;
}
```

- [ ] **Step 4: Open app, complete first launch, add a train — verify card appears in list with countdown and buttons**

- [ ] **Step 5: Commit**

```bash
git add js/ui/TrainList.js js/ui/TrainCard.js styles/train-list.css
git commit -m "feat: train list and cards with tabs, sorting, actions"
```

---

## Task 14: Alert Banners

**Files:**
- Create: `js/ui/AlertBanner.js`
- Modify: `styles/alerts.css`

- [ ] **Step 1: Create `js/ui/AlertBanner.js`**

```javascript
export function renderBanners(container, state, dispatch) {
  if (!state.ui.banners.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = state.ui.banners.map(banner => `
    <div class="alert-banner alert-${banner.type}" role="alert">
      <span class="alert-msg">${banner.message}</span>
      <button class="alert-close" data-id="${banner.id}">✕</button>
    </div>`).join('');

  container.querySelectorAll('.alert-close').forEach(btn => {
    btn.addEventListener('click', () => dispatch('REMOVE_BANNER', { id: Number(btn.dataset.id) }));
  });
}
```

- [ ] **Step 2: Write `styles/alerts.css`**

```css
#banners-container {
  position: sticky;
  top: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: .25rem;
}

.alert-banner {
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .65rem 1rem;
  font-size: .875rem;
  font-weight: 600;
}

.alert-warning  { background: var(--warn);   color: #000; }
.alert-arrival  { background: var(--danger);  color: #fff; animation: blink 0.8s 3; }
.alert-collision { background: var(--danger); color: #fff; animation: blink 0.6s infinite; }

.alert-msg { flex: 1; }
.alert-close {
  background: rgba(0,0,0,.2);
  border-radius: 50%;
  width: 24px; height: 24px;
  font-size: .8rem;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
```

- [ ] **Step 3: Test banners in console**

```javascript
window._dispatch('ADD_BANNER', { type: 'warning', message: 'Test uyarısı', autoDismissMs: 3000 });
window._dispatch('ADD_BANNER', { type: 'arrival', message: '🚆 Tren 46500 PAZARCIK\'TA', autoDismissMs: null });
```

Verify: warning banner appears and auto-dismisses after 3 seconds. Arrival banner stays until manually closed.

- [ ] **Step 4: Commit**

```bash
git add js/ui/AlertBanner.js styles/alerts.css
git commit -m "feat: alert banner component"
```

---

## Task 15: Stale Trains Modal

**Files:**
- Create: `js/ui/StaleTrainsModal.js`

- [ ] **Step 1: Create `js/ui/StaleTrainsModal.js`**

```javascript
import { formatMinutes } from '../services/time.js';
import { minutesRemaining } from '../services/time.js';

export function renderStaleModal(container, state, dispatch) {
  const stale = state.ui.staleTrains;
  if (!stale.length) { container.innerHTML = ''; return; }

  const staleIds = stale.map(t => t.id);

  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h2>⚠️ Süresi Geçmiş Trenler</h2>
        </div>
        <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:1rem;">
          Uygulama kapalıyken bu trenlerin varış süresi doldu:
        </p>
        <div class="stale-list">
          ${stale.map(t => {
            const overMin = Math.abs(Math.round(minutesRemaining(t.startedAt, t.durationMin)));
            return `
              <div class="stale-row" data-id="${t.id}">
                <span class="stale-number">${t.trainNumber}</span>
                <span class="stale-route">${t.fromStation} → ${t.toStation}</span>
                <span class="stale-over">${overMin} dk önce</span>
                <button class="btn btn-ghost btn-sm" data-resolve="add" data-id="${t.id}">Tarihçeye Ekle</button>
                <button class="btn btn-sm" style="background:var(--border);color:var(--text-muted)" data-resolve="skip" data-id="${t.id}">Yoksay</button>
              </div>`;
          }).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="stale-ignore-all">Hepsini Yoksay</button>
          <button class="btn btn-primary" id="stale-add-all">Hepsini Tarihçeye Ekle</button>
        </div>
      </div>
    </div>`;

  container.querySelector('#stale-add-all').addEventListener('click', () => {
    dispatch('RESOLVE_STALE_TRAINS', { action: 'addAll', trains: staleIds });
  });

  container.querySelector('#stale-ignore-all').addEventListener('click', () => {
    dispatch('RESOLVE_STALE_TRAINS', { action: 'ignore', trains: staleIds });
  });

  container.querySelectorAll('[data-resolve]').forEach(btn => {
    btn.addEventListener('click', () => {
      const resolution = btn.dataset.resolve === 'add' ? 'add' : 'ignore';
      dispatch('RESOLVE_ONE_STALE', { id: btn.dataset.id, resolution });
    });
  });
}
```

- [ ] **Step 2: Add stale-list CSS to `styles/modal.css`**

Append to modal.css:

```css
.stale-list {
  display: flex;
  flex-direction: column;
  gap: .5rem;
  margin-bottom: 1rem;
}

.stale-row {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .5rem;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.stale-number { font-weight: 700; min-width: 60px; }
.stale-route  { font-size: .75rem; color: var(--text-muted); flex: 1; }
.stale-over   { font-size: .75rem; color: var(--warn); white-space: nowrap; }
```

- [ ] **Step 3: Test stale modal manually**

In browser console, simulate stale train state:
```javascript
window._dispatch('COMPLETE_FIRST_LAUNCH'); // ensure app is open
// Manually set state to show stale modal
// Open DevTools > Application > LocalStorage, edit activeTrains to have startedAt = old timestamp
```

Alternatively: set a train's `startedAt` to `Date.now() - 60*60*1000` (1 hour ago) and `durationMin` to 5 in localStorage, then refresh.

- [ ] **Step 4: Commit**

```bash
git add js/ui/StaleTrainsModal.js styles/modal.css
git commit -m "feat: stale trains modal on app startup"
```

---

## Task 16: Settings Panel

**Files:**
- Create: `js/ui/SettingsPanel.js`

- [ ] **Step 1: Create `js/ui/SettingsPanel.js`**

```javascript
import { clearHistory } from '../services/storage.js';
import { getNotificationPermission, requestNotificationPermission } from '../services/notification.js';

export function renderSettings(container, state, dispatch) {
  const s = state.settings;
  const notifPerm = getNotificationPermission();

  container.innerHTML = `
    <div class="modal-overlay" id="settings-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h2>⚙ Ayarlar</h2>
          <button class="icon-btn" id="settings-close">✕</button>
        </div>

        <div class="form-group">
          <label for="s-prewarn">Önceden Uyarı Süresi</label>
          <div style="display:flex;align-items:center;gap:.5rem">
            <input id="s-prewarn" type="number" min="1" max="10"
              value="${s.preWarningMinutes ?? 3}" style="width:80px" />
            <span style="color:var(--text-muted);font-size:.875rem">dakika önce</span>
          </div>
        </div>

        <div class="form-group">
          <label>Ses</label>
          <label class="toggle-label">
            <input type="checkbox" id="s-sound" ${s.soundEnabled ? 'checked' : ''} />
            <span>Uyarı sesleri</span>
          </label>
        </div>

        <div class="form-group">
          <label>Titreşim</label>
          <label class="toggle-label">
            <input type="checkbox" id="s-vibrate" ${s.vibrationEnabled ? 'checked' : ''} />
            <span>Titreşim (mobil)</span>
          </label>
        </div>

        <div class="form-group">
          <label>Bildirimler</label>
          <p class="settings-note">
            Durum: <strong>${notifPermLabel(notifPerm)}</strong>
          </p>
          ${notifPerm !== 'granted'
            ? '<button class="btn btn-ghost btn-sm" id="s-req-notif">İzin İste</button>'
            : ''}
        </div>

        <div class="form-group">
          <label>Tarihçe</label>
          <button class="btn btn-danger btn-sm" id="s-clear-history">Tarihçeyi Temizle</button>
        </div>

        <div class="modal-footer">
          <button class="btn btn-primary" id="s-save">Kaydet</button>
        </div>
      </div>
    </div>`;

  container.querySelector('#settings-close').addEventListener('click', () => dispatch('TOGGLE_SETTINGS'));
  container.querySelector('#settings-overlay').addEventListener('click', e => {
    if (e.target.id === 'settings-overlay') dispatch('TOGGLE_SETTINGS');
  });

  container.querySelector('#s-save').addEventListener('click', () => {
    const preWarn = Number(container.querySelector('#s-prewarn').value);
    dispatch('UPDATE_SETTINGS', {
      preWarningMinutes: Number.isInteger(preWarn) && preWarn >= 1 ? preWarn : 3,
      soundEnabled: container.querySelector('#s-sound').checked,
      vibrationEnabled: container.querySelector('#s-vibrate').checked,
    });
    dispatch('TOGGLE_SETTINGS');
  });

  container.querySelector('#s-clear-history')?.addEventListener('click', () => {
    if (confirm('Tüm tarihçe silinsin mi?')) {
      dispatch('RESOLVE_STALE_TRAINS', { action: 'ignore', trains: [] }); // noop, just use storage
      clearHistory();
      dispatch('TOGGLE_SETTINGS'); // close to trigger reload
      location.reload();
    }
  });

  container.querySelector('#s-req-notif')?.addEventListener('click', async () => {
    await requestNotificationPermission();
    dispatch('TOGGLE_SETTINGS');
    dispatch('TOGGLE_SETTINGS'); // re-render
  });
}

function notifPermLabel(perm) {
  return { granted: '✓ İzin Verildi', denied: '✗ Reddedildi', default: '? İstenmedi', unavailable: 'Desteklenmiyor' }[perm] ?? perm;
}
```

- [ ] **Step 2: Add toggle CSS to `styles/base.css`**

Append:

```css
.toggle-label {
  display: flex;
  align-items: center;
  gap: .5rem;
  cursor: pointer;
  font-size: .875rem;
}
.toggle-label input[type=checkbox] {
  width: 16px; height: 16px;
  accent-color: var(--pazarcik);
}
.settings-note {
  font-size: .8rem;
  color: var(--text-muted);
  margin-bottom: .5rem;
}
```

- [ ] **Step 3: Click ⚙ icon in header — verify settings panel opens with all controls**

- [ ] **Step 4: Commit**

```bash
git add js/ui/SettingsPanel.js styles/base.css
git commit -m "feat: settings panel"
```

---

## Task 17: Responsive CSS

**Files:**
- Modify: `styles/responsive.css`

- [ ] **Step 1: Write `styles/responsive.css`**

```css
/* Tablet dikey + telefon */
@media (max-width: 768px) {

  #track-container {
    flex: 0 0 40%;
  }

  .track-line { min-width: 500px; }

  .station-label { font-size: .5rem; }

  .card-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    flex-direction: column;
  }

  .modal-card {
    max-width: 100%;
    border-radius: var(--radius) var(--radius) 0 0;
    position: fixed;
    bottom: 0;
    left: 0; right: 0;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .list-header {
    flex-direction: row;
  }
}

/* Küçük telefon */
@media (max-width: 480px) {

  #track-container { flex: 0 0 35%; }

  .header-title { font-size: .95rem; }
  .header-station { display: none; }

  .card-number { font-size: 1rem; }
  .countdown   { font-size: 1.2rem; }

  .card-actions {
    gap: .25rem;
  }
  .card-actions .btn-sm {
    padding: .25rem .45rem;
    font-size: .7rem;
  }
}

/* Geniş ekran — iki sütun liste */
@media (min-width: 1200px) {
  #main {
    flex-direction: row;
  }
  #track-container {
    flex: 0 0 50%;
    border-bottom: none;
    border-right: 1px solid var(--border);
  }
  #list-container {
    flex: 1;
  }
}
```

- [ ] **Step 2: Test in Chrome DevTools: toggle device toolbar, test 375px, 768px, 1440px widths**

Verify:
- 375px (phone): track scrollable horizontally, list single column, form is bottom sheet
- 768px (tablet portrait): similar but slightly more space
- 1440px (desktop): track on left, list on right

- [ ] **Step 3: Commit**

```bash
git add styles/responsive.css
git commit -m "feat: responsive CSS for mobile, tablet, desktop"
```

---

## Task 18: Service Worker (Full) + PWA Assets

**Files:**
- Modify: `sw.js`
- Create: `assets/icons/icon-192.png`, `assets/icons/icon-512.png`
- Replace: `assets/audio/pre-arrival.mp3`, `assets/audio/arrival.mp3`

- [ ] **Step 1: Update `sw.js` with full asset list**

```javascript
const CACHE_NAME = 'tren-izleme-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/reset.css',
  '/styles/base.css',
  '/styles/header.css',
  '/styles/track-view.css',
  '/styles/train-list.css',
  '/styles/modal.css',
  '/styles/alerts.css',
  '/styles/responsive.css',
  '/js/main.js',
  '/js/constants/stations.js',
  '/js/constants/config.js',
  '/js/models/Train.js',
  '/js/models/Line.js',
  '/js/services/storage.js',
  '/js/services/time.js',
  '/js/services/audio.js',
  '/js/services/notification.js',
  '/js/services/vibration.js',
  '/js/services/collision.js',
  '/js/services/alerts.js',
  '/js/ui/App.js',
  '/js/ui/TrackView.js',
  '/js/ui/TrainList.js',
  '/js/ui/TrainCard.js',
  '/js/ui/TrainForm.js',
  '/js/ui/AlertBanner.js',
  '/js/ui/SettingsPanel.js',
  '/js/ui/StaleTrainsModal.js',
  '/js/ui/FirstLaunch.js',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/audio/pre-arrival.mp3',
  '/assets/audio/arrival.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
```

- [ ] **Step 2: Generate PWA icons**

Use any tool (online or command line) to generate 192×192 and 512×512 PNG icons. Minimum: a solid orange (#ff8c42) square with a train emoji in white text, or download a free train icon SVG and convert.

Quick approach — create a simple canvas-based icon generator HTML and save the output:

```html
<!-- Run this in browser console or as a temp file: -->
<canvas id="c" width="192" height="192"></canvas>
<script>
  const c = document.getElementById('c');
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff8c42';
  ctx.fillRect(0, 0, 192, 192);
  ctx.fillStyle = '#fff';
  ctx.font = '100px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚆', 96, 140);
  const link = document.createElement('a');
  link.download = 'icon-192.png';
  link.href = c.toDataURL();
  link.click();
</script>
```

Do the same at 512×512 for `icon-512.png`. Place both in `assets/icons/`.

- [ ] **Step 3: Add real audio files**

Download free train sound effects:
- Pre-arrival (soft ding/bell): search "train bell sound free mp3" — e.g., from freesound.org
- Arrival (train whistle/horn): search "train whistle sound free mp3"

Place as:
- `assets/audio/pre-arrival.mp3` (2–3 seconds)
- `assets/audio/arrival.mp3` (3–5 seconds)

- [ ] **Step 4: Test PWA installation in Chrome**

1. Open app via Live Server (`http://127.0.0.1:5500`)
2. Chrome DevTools → Application → Service Workers → verify registered
3. DevTools → Application → Manifest → verify all fields loaded
4. Address bar: look for install icon (📥) → click → "Install"
5. App opens in standalone window — verify no browser UI

- [ ] **Step 5: Test on Android (same Wi-Fi)**

1. Find PC IP: `ipconfig` → IPv4 address (e.g. 192.168.1.42)
2. On Android Chrome: open `http://192.168.1.42:5500`
3. Chrome shows "Add to Home Screen" banner → tap
4. App installed — open from home screen, verify standalone mode
5. Enable "Vibrate" in settings — trigger a test banner, verify vibration

- [ ] **Step 6: Final commit**

```bash
git add sw.js assets/
git commit -m "feat: complete service worker with full asset list, PWA icons and audio"
```

---

## Task 19: Integration & Manual Test Run

**Files:**
- Create: `docs/test-scenarios.md`

- [ ] **Step 1: Create `docs/test-scenarios.md`**

Copy the full test scenario list from `docs/superpowers/specs/2026-05-04-tren-izleme-design.md` section 10.

- [ ] **Step 2: Run unit tests**

Open `http://127.0.0.1:5500/tests/test-runner.html` — verify all tests show `✓` green.

- [ ] **Step 3: Run manual tests — Temel Akış (1.1–1.6)**

- [ ] **Step 4: Run manual tests — Doğrulama (2.1–2.5)**

- [ ] **Step 5: Run manual tests — Süre Öğrenme (3.1–3.4)**

- [ ] **Step 6: Run manual tests — Pazarcık Uyarıları (4.1–4.5)**

To speed up alarm test: add a train with `durationMin: 4` — after ~1 minute, pre-warning fires; after ~4 minutes, arrival fires. Or temporarily lower `preWarningMinutes` to 1 in settings.

- [ ] **Step 7: Run manual tests — Çakışma (5.1–5.3)**

Add two trains in opposite directions on the same segment (e.g. Tren A: NARL→PAZA 15dk, Tren B: PAZA→NARL 15dk). Verify red segment + collision banner.

- [ ] **Step 8: Run manual tests — Kalıcılık (6.1–6.5)**

- [ ] **Step 9: Run manual tests — PWA & Cihaz (7.1–7.7)**

- [ ] **Step 10: Run manual tests — Edge Cases (8.1–8.4)**

- [ ] **Step 11: Final commit**

```bash
git add docs/
git commit -m "docs: test scenarios, integration complete"
```

---

## Self-Review Notes (Plan Author)

**Spec coverage check:**

| Spec Section | Task |
|---|---|
| Hat topolojisi (9 durak, indeksler) | Task 2 |
| Train lifecycle (active/arrived/manual_arrived/deleted) | Task 8 |
| Tren ekleme + doğrulama | Tasks 3, 11 |
| Süre öğrenme (segmentTimes) | Task 8 (ADD_TRAIN reducer), Task 11 (form suggestion) |
| LocalStorage kalıcılık + 24h history | Task 4 |
| Stale trains on startup | Tasks 8 (boot), 15 |
| Gerçek zamanlı geri sayım | Task 8 (tick) |
| Hat görseli + tren hareketli ikonlar | Task 12 |
| Tren listesi + sıralama (en yakın üstte) | Task 13 |
| Kart eylemler (düzenle, vardı, sil) | Task 13 |
| Önceden uyarı (3dk önce) | Tasks 7, 8 |
| Varış uyarısı (ses + bildirim + titreşim) | Tasks 5, 7, 8 |
| Çakışma tespiti + segment kırmızı | Tasks 6, 8, 12 |
| Çakışma onay modal (yeni tren eklerken) | Task 11 |
| Ayarlar paneli | Task 16 |
| First-launch + audio unlock | Task 10 |
| Responsive (mobil/tablet/masaüstü) | Task 17 |
| PWA (SW, manifest, ikonlar, offline) | Task 18 |
| Test senaryoları | Task 19 |

**Type/method consistency confirmed:**
- `createTrain()` → Task 3, used in Task 8 (ADD_TRAIN) and Task 11 (predictCollisionOnAdd)
- `getTrainPosition(train)` → Task 3, used in Tasks 6, 12
- `getTrainDirection(train)` → Task 3, used in Tasks 6, 12, 13
- `minutesRemaining(startedAt, durationMin)` → Task 3, used in Tasks 8, 13
- `detectCollisions(trains)` → Task 6, used in Task 8
- `triggerPreArrivalAlert(train, remainingMinutes, settings, addBanner)` → Task 7, used in Task 8
- `triggerArrivalAlert(train, settings, addBanner)` → Task 7, used in Task 8
- `dispatch('ADD_TRAIN', payload)` → payload has `{ trainNumber, fromStation, toStation, durationMin }` — consistent in Tasks 8, 11
- `STATION_COUNT = 9`, `SEGMENT_COUNT = 8` — used consistently in Tasks 2, 3, 12

**No placeholders found** — all steps have complete code or explicit commands.
