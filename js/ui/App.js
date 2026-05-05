import { loadData, saveData } from '../services/storage.js';
import { createTrain, getTrainPosition } from '../models/Train.js';
import { initAudio } from '../services/audio.js';
import { detectCollisions } from '../services/collision.js';
import { triggerPreArrivalAlert, triggerArrivalAlert, triggerCollisionAlert } from '../services/alerts.js';
import { WATCHED_STATION_ID } from '../constants/config.js';
import { minutesRemaining, formatMinutes } from '../services/time.js';
import { SEGMENT_COUNT } from '../constants/stations.js';

// ─── State ─────────────────────────────────────────────────────────────────

let state = {
  trains:               [],
  history:              [],
  settings:             {},
  segmentTimes:         {},
  firstLaunchCompleted: false,
  ui: {
    activeTab:      'active',
    showForm:       false,
    editingTrain:   null,
    showSettings:   false,
    banners:        [],
    showStaleModal: false,
    staleTrains:    [],
    collisions:     [],
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
  const preWarnMin = state.settings.preWarningMinutes ?? 3;
  const addBanner  = banner => dispatch('ADD_BANNER', banner);

  let changed = false;
  let arrivedThisTick = [];

  const updatedTrains = state.trains.map(train => {
    if (train.status !== 'active') return train;
    const remaining = minutesRemaining(train.startedAt, train.durationMin);

    // Arrival
    if (remaining <= 0) {
      changed = true;
      arrivedThisTick.push({ ...train, status: 'arrived', arrivedAt: now, endedAt: now });
      if (train.toStation === WATCHED_STATION_ID) {
        triggerArrivalAlert(train, state.settings, addBanner);
      }
      return null; // will be filtered out
    }

    // Pre-warning (fires once per train)
    if (!train.preWarningFired && remaining <= preWarnMin && train.toStation === WATCHED_STATION_ID) {
      triggerPreArrivalAlert(train, remaining, state.settings, addBanner);
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

function updateCountdownsInDOM() {
  state.trains.forEach(train => {
    const el = document.querySelector(`[data-train-id="${train.id}"] .countdown`);
    if (!el) return;
    const rem = minutesRemaining(train.startedAt, train.durationMin);
    el.textContent = formatMinutes(rem);
    const card = el.closest('[data-train-id]');
    if (card) card.classList.toggle('urgent', rem <= 3 && rem > 0);
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
  if (!el) return;
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
  const staleTrains = (saved.activeTrains || []).filter(t => minutesRemaining(t.startedAt, t.durationMin) <= 0);
  const activeTrains = (saved.activeTrains || []).filter(t => minutesRemaining(t.startedAt, t.durationMin) > 0);

  state = {
    trains:               activeTrains,
    history:              saved.history || [],
    settings:             { ...{ preWarningMinutes: 3, soundEnabled: true, vibrationEnabled: true }, ...(saved.settings || {}) },
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
