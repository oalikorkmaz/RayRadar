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
