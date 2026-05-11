import { loadData, saveData } from '../services/storage.js';
import { createTrain, getTrainPosition } from '../models/Train.js';
import { initAudio, setCustomSound } from '../services/audio.js';
import { detectCollisions } from '../services/collision.js';
import { triggerPreArrivalAlert, triggerArrivalAlert, triggerCollisionAlert } from '../services/alerts.js';
import { DEFAULT_SETTINGS } from '../constants/config.js';
import { DEFAULT_STATIONS, reindexStations, slugify, getStationById } from '../constants/stations.js';
import { minutesRemaining, formatMinutes } from '../services/time.js';

// ─── State ─────────────────────────────────────────────────────────────────

let state = {
  trains:               [],
  history:              [],
  settings:             {},
  segmentTimes:         {},
  firstLaunchCompleted: false,
  ui: {
    activeTab:       'active',
    showForm:        false,
    editingTrain:    null,
    showSettings:    false,
    showMobilePanel: false,   // mobil alt çekmece
    banners:         [],
    showStaleModal:  false,
    staleTrains:     [],
    collisions:      [],
  },
};

// ─── Public API ────────────────────────────────────────────────────────────

export function getState() { return state; }

export function dispatch(action, payload) {
  state = reduce(state, action, payload);
  persistState();
  renderAll();
}

// ─── Reducer ───────────────────────────────────────────────────────────────

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

    case 'REPOSITION_TRAIN': {
      const { id, fromStation } = payload;
      const activeStations = s.settings.stations || DEFAULT_STATIONS;
      const draggedFrom = getStationById(fromStation, activeStations);
      const target = s.trains.find(t => t.id === id);
      if (!target || !draggedFrom || fromStation === target.toStation) return s;

      const originalFrom = getStationById(target.fromStation, activeStations);
      const originalTo   = getStationById(target.toStation,   activeStations);
      if (!originalFrom || !originalTo) return s;

      const originalDistance = Math.abs(originalTo.index - originalFrom.index);
      const newDistance = Math.abs(originalTo.index - draggedFrom.index);
      if (originalDistance === 0 || newDistance === 0) return s;

      const segKey = `${fromStation}->${target.toStation}`;
      const savedDuration = Number(s.segmentTimes[segKey]);
      const durationMin = Number.isFinite(savedDuration) && savedDuration > 0
        ? savedDuration
        : Math.max(1, Math.ceil(Number(target.durationMin) * (newDistance / originalDistance)));

      return {
        ...s,
        trains: s.trains.map(t =>
          t.id === id
            ? { ...t, fromStation, durationMin, startedAt: Date.now(), preWarningFired: false }
            : t
        ),
        segmentTimes: { ...s.segmentTimes, [segKey]: durationMin },
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

    case 'TOGGLE_MOBILE_PANEL':
      return { ...s, ui: { ...s.ui, showMobilePanel: !s.ui.showMobilePanel } };

    case 'CLOSE_MOBILE_PANEL':
      return { ...s, ui: { ...s.ui, showMobilePanel: false } };

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

    // ─── İstasyon yönetimi ──────────────────────────────────────────────────

    case 'ADD_STATION': {
      const { label, insertAfterIndex } = payload;
      const id = slugify(label) + '_' + Date.now().toString(36).slice(-4);
      const newStation = { id, label, shortLabel: label.slice(0, 4).toUpperCase(), index: 0 };
      const current = s.settings.stations || DEFAULT_STATIONS;
      const idx = typeof insertAfterIndex === 'number'
        ? Math.min(insertAfterIndex + 1, current.length)
        : current.length;
      const updated = [...current.slice(0, idx), newStation, ...current.slice(idx)];
      return { ...s, settings: { ...s.settings, stations: reindexStations(updated) } };
    }

    case 'REMOVE_STATION': {
      const { id } = payload;
      const current = s.settings.stations || DEFAULT_STATIONS;
      if (current.length <= 2) return s; // en az 2 durak olmalı
      const updated = current.filter(st => st.id !== id);
      // O durağa atanmış aktif trenleri bildir (kullanıcı görecek)
      return {
        ...s,
        settings: { ...s.settings, stations: reindexStations(updated) },
        trains: s.trains.filter(t => t.fromStation !== id && t.toStation !== id),
        ui: { ...s.ui, removedStationWarning: id },
      };
    }

    case 'UPDATE_STATION': {
      const { id, label } = payload;
      const current = s.settings.stations || DEFAULT_STATIONS;
      return {
        ...s,
        settings: {
          ...s.settings,
          stations: current.map(st =>
            st.id === id ? { ...st, label, shortLabel: label.slice(0, 4).toUpperCase() } : st
          ),
        },
      };
    }

    case 'UPDATE_CUSTOM_SOUND': {
      const { type, dataUrl } = payload;
      setCustomSound(type, dataUrl);
      return {
        ...s,
        settings: {
          ...s.settings,
          customSounds: { ...s.settings.customSounds, [type]: dataUrl },
        },
      };
    }

    case 'RESOLVE_STALE_TRAINS': {
      const { action: resolution, trains: staleIds } = payload;
      if (resolution === 'addAll') {
        const added = s.ui.staleTrains.map(t => ({
          ...t,
          status: 'arrived',
          endedAt: t.startedAt + t.durationMin * 60_000,
        }));
        return {
          ...s,
          trains: s.trains.filter(t => !staleIds.includes(t.id)),
          history: [...added, ...s.history],
          ui: { ...s.ui, showStaleModal: false, staleTrains: [] },
        };
      }
      // 'ignore' — just remove from active, don't add to history
      return {
        ...s,
        trains: s.trains.filter(t => !staleIds.includes(t.id)),
        ui: { ...s.ui, showStaleModal: false, staleTrains: [] },
      };
    }

    case 'RESOLVE_ONE_STALE': {
      const { id, resolution } = payload;
      const target = s.ui.staleTrains.find(t => t.id === id);
      if (!target) return s;
      const remaining = s.ui.staleTrains.filter(t => t.id !== id);
      let history = s.history;
      if (resolution === 'add') {
        history = [
          { ...target, status: 'arrived', endedAt: target.startedAt + target.durationMin * 60_000 },
          ...history,
        ];
      }
      return {
        ...s,
        trains: s.trains.filter(t => t.id !== id),
        history,
        ui: { ...s.ui, staleTrains: remaining, showStaleModal: remaining.length > 0 },
      };
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
  const preWarnMin       = state.settings.preWarningMinutes ?? 3;
  const alertScope       = state.settings.alertScope ?? 'all';
  const watchedStationId = state.settings.watchedStationId ?? 'PAZA';
  const addBanner        = banner => dispatch('ADD_BANNER', banner);

  let changed = false;
  let arrivedThisTick = [];

  const updatedTrains = state.trains.map(train => {
    if (train.status !== 'active') return train;
    const remaining = minutesRemaining(train.startedAt, train.durationMin);

    // Varış kontrolü
    if (remaining <= 0) {
      changed = true;
      arrivedThisTick.push({ ...train, status: 'arrived', arrivedAt: now, endedAt: now });
      // alertScope: 'all' → her tren, 'watched' → sadece izlenen istasyona gidenler
      if (alertScope === 'all' || train.toStation === watchedStationId) {
        triggerArrivalAlert(train, state.settings, addBanner);
      }
      return null;
    }

    // Önceden uyarı (tek seferlik)
    if (!train.preWarningFired && remaining <= preWarnMin) {
      if (alertScope === 'all' || train.toStation === watchedStationId) {
        triggerPreArrivalAlert(train, remaining, state.settings, addBanner);
      }
      changed = true;
      return { ...train, preWarningFired: true };
    }

    return train;
  });

  if (changed) {
    const activeTrains = updatedTrains.filter(t => t !== null);
    state = {
      ...state,
      trains: activeTrains,
      history: [...arrivedThisTick, ...state.history],
    };
    persistState();
    renderAll();
    return;
  }

  // Collision detection every tick
  const collisions = detectCollisions(state.trains);
  const prevCollisionCount = state.ui.collisions.length;

  // Alert on new collisions
  collisions.forEach(col => {
    const wasKnown = state.ui.collisions.some(
      c => c.trainA.id === col.trainA.id && c.trainB.id === col.trainB.id
    );
    if (!wasKnown) {
      triggerCollisionAlert(col, addBanner);
    }
  });

  if (collisions.length !== prevCollisionCount) {
    state = { ...state, ui: { ...state.ui, collisions } };
    renderAll();
    return;
  }

  state = { ...state, ui: { ...state.ui, collisions } };

  // Lightweight DOM updates — no full re-render
  updateCountdownsInDOM();
  updateTrackPositionsInDOM();
}

// ─── Lightweight DOM Updates ───────────────────────────────────────────────

// Train.js'in dinamik istasyon destekli wrapperı
function getTrainPositionWithStations(train, stations) {
  return getTrainPosition(train, stations || DEFAULT_STATIONS);
}

function updateCountdownsInDOM() {
  state.trains.forEach(train => {
    const el = document.querySelector(`[data-train-id="${train.id}"] .countdown`);
    if (!el) return;
    const rem = minutesRemaining(train.startedAt, train.durationMin);
    el.textContent = formatMinutes(rem);
    const card = el.closest('[data-train-id]');
    if (card) card.classList.toggle('urgent', rem <= 3 && rem > 0);

    const trackTime = document.querySelector(`.topdown-train[data-train-id="${train.id}"] .train-chip strong`);
    if (trackTime) {
      trackTime.textContent = formatMinutes(rem);
    }
  });
  updateClockInDOM();
}

function updateTrackPositionsInDOM() {
  const segCount = (state.settings.stations?.length ?? 9) - 1;
  state.trains.forEach(train => {
    const el = document.querySelector(`.topdown-train[data-train-id="${train.id}"]`);
    if (!el) return;
    if (el.classList.contains('dragging')) return;
    const pos = getTrainPositionWithStations(train, state.settings.stations);
    if (pos === null) return;
    const left = 60 + (pos / segCount) * 1040;
    el.style.left = `${left}px`;
  });

  // Segment collision highlights
  const collisionSegments = new Set(state.ui.collisions.map(c => c.segmentIndex));
  document.querySelectorAll('[data-segment-index]').forEach(seg => {
    const idx = Number(seg.dataset.segmentIndex);
    seg.classList.toggle('rail-risk', collisionSegments.has(idx));
    seg.classList.toggle('rail-normal', !collisionSegments.has(idx));
  });
}

function updateClockInDOM() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── Rendering ─────────────────────────────────────────────────────────────

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

  fns.TrackView.renderTrackView(document.getElementById('track-container'), s, dispatch);
  fns.TrainList.renderTrainList(document.getElementById('list-container'), s, dispatch);
  fns.AlertBanner.renderBanners(document.getElementById('banners-container'), s, dispatch);

  // Mobil alt çekmece ve backdrop
  const listEl     = document.getElementById('list-container');
  const backdropEl = document.getElementById('list-backdrop');
  if (listEl)     listEl.classList.toggle('panel-open', s.ui.showMobilePanel);
  if (backdropEl) {
    backdropEl.classList.toggle('visible', s.ui.showMobilePanel);
    backdropEl.onclick = () => dispatch('CLOSE_MOBILE_PANEL');
  }

  // Mobil alt bar
  renderMobileBar(s);

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
  if (!el) return;
  const activeCount  = s.trains.filter(t => t.status === 'active').length;
  const alertCount   = s.ui.banners.length + s.ui.collisions.length;
  const clock        = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const stations     = s.settings.stations || DEFAULT_STATIONS;
  const watchedId    = s.settings.watchedStationId || 'PAZA';
  const watchedLabel = getStationById(watchedId, stations)?.label ?? watchedId;

  el.innerHTML = `
    <div class="topbar">
      <div class="brand-block">
        <span class="logo-mark">T</span>
        <div>
          <strong>Tren İzleme</strong>
          <small>v1.0</small>
        </div>
      </div>
      <span class="watched-pill"><i></i> İzlenen: ${watchedLabel}</span>
      <span class="system-pill"><i></i> Sistem aktif</span>
      <span class="active-pill">${activeCount} aktif tren</span>
      <div class="topbar-spacer"></div>
      <time class="topbar-clock" id="topbar-clock">${clock}</time>
      <button class="topbar-icon" title="Bildirimler" aria-label="Bildirimler">
        <span>🔔</span>
        ${alertCount ? `<em>${alertCount}</em>` : ''}
      </button>
      <button class="topbar-icon" onclick="window._dispatch('TOGGLE_SETTINGS')" title="Ayarlar" aria-label="Ayarlar">
        <span>⚙</span>
      </button>
    </div>`;
}
// ─── Mobil Alt Bar ─────────────────────────────────────────────────────────

function renderMobileBar(s) {
  const bar = document.getElementById('mobile-bottom-bar');
  if (!bar) return;

  const activeCount   = s.trains.filter(t => t.status === 'active').length;
  const panelOpen     = s.ui.showMobilePanel;
  const collisionCount = s.ui.collisions.length;

  bar.innerHTML = `
    <button class="mobile-bar-btn ${panelOpen ? 'active' : ''}"
            onclick="window._dispatch('TOGGLE_MOBILE_PANEL')"
            aria-label="Tren listesi" aria-expanded="${panelOpen}">
      <span class="mobile-bar-icon">≡</span>
      <span class="mobile-bar-label">Listele${activeCount > 0 ? ` (${activeCount})` : ''}</span>
    </button>

    <button class="mobile-bar-fab"
            onclick="window._dispatch('OPEN_FORM')"
            aria-label="Yeni tren ekle">
      <span>+</span>
    </button>

    <button class="mobile-bar-btn ${collisionCount > 0 ? 'danger' : ''}"
            onclick="window._dispatch('TOGGLE_SETTINGS')"
            aria-label="Ayarlar">
      <span class="mobile-bar-icon">⚙</span>
      <span class="mobile-bar-label">Ayarlar</span>
    </button>`;
}

// ─── Boot ──────────────────────────────────────────────────────────────────

/** Viewport boyutuna göre body class'larını günceller.
 *  Hem CSS @media hem JS body class ile çalışır — ikili güvence. */
function updateMobileClass() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  document.body.classList.toggle('is-mobile',    w <= 900);
  document.body.classList.toggle('is-small',     w <= 480);
  document.body.classList.toggle('is-landscape', w <= 900 && h <= 500);
}

export async function boot() {
  // Make dispatch accessible from inline onclick handlers
  window._dispatch = dispatch;

  // Mobil layout class'ını başlat ve ekran boyutu değişince güncelle
  updateMobileClass();
  window.addEventListener('resize', () => {
    updateMobileClass();
    renderAll();  // layout değişince yeniden çiz
  });

  // Kaydedilmiş custom sound'ları da geçir
  const savedForAudio = loadData();
  initAudio(savedForAudio.settings?.customSounds || {});

  const saved = loadData();
  const now = Date.now();

  // Separate stale trains (arrived while app was closed)
  const staleTrains = (saved.activeTrains || []).filter(t => minutesRemaining(t.startedAt, t.durationMin) <= 0);
  const activeTrains = (saved.activeTrains || []).filter(t => minutesRemaining(t.startedAt, t.durationMin) > 0);

  state = {
    trains:               activeTrains,
    history:              saved.history || [],
    settings:             { ...DEFAULT_SETTINGS, ...(saved.settings || {}) },
    segmentTimes:         saved.segmentTimes || {},
    firstLaunchCompleted: saved.firstLaunchCompleted || false,
    ui: {
      activeTab:      'active',
      showForm:       false,
      editingTrain:   null,
      showSettings:   false,
      banners:        [],
      showStaleModal: staleTrains.length > 0,
      staleTrains,
      collisions:     [],
    },
  };

  await renderAll();

  // Start 1-second tick
  setInterval(tick, 1000);
}


