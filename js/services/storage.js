import { STORAGE_KEY, SCHEMA_VERSION, DEFAULT_SETTINGS, HISTORY_RETENTION_MS } from '../constants/config.js';
import { DEFAULT_STATIONS } from '../constants/stations.js';

export const DEFAULT_DATA = {
  schemaVersion: SCHEMA_VERSION,
  firstLaunchCompleted: false,
  settings: {
    ...DEFAULT_SETTINGS,
    stations: DEFAULT_STATIONS,   // kullanıcı tarafından özelleştirilebilir durak listesi
  },
  activeTrains: [],
  history: [],
  segmentTimes: {},
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);

    const data = JSON.parse(raw);

    // Şema v1 → v2 migrasyonu: stations ve yeni ayarlar eksikse ekle
    if (data.schemaVersion === 1) {
      console.info('[storage] v1→v2 migration: stations ve yeni ayarlar ekleniyor');
      data.schemaVersion = 2;
      data.settings = {
        ...DEFAULT_SETTINGS,
        ...data.settings,
        stations: data.settings?.stations ?? DEFAULT_STATIONS,
        alertScope: data.settings?.alertScope ?? 'all',
        watchedStationId: data.settings?.watchedStationId ?? 'PAZA',
        customSounds: data.settings?.customSounds ?? { preArrival: null, arrival: null, collision: null },
      };
      saveData(data);
    }

    if (data.schemaVersion !== SCHEMA_VERSION) {
      console.warn('[storage] Schema mismatch — resetting to defaults');
      return structuredClone(DEFAULT_DATA);
    }

    // Eksik settings alanlarını varsayılanlarla doldur
    data.settings = { ...DEFAULT_SETTINGS, stations: DEFAULT_STATIONS, ...data.settings };
    if (!data.settings.customSounds) data.settings.customSounds = { preArrival: null, arrival: null, collision: null };
    if (!Array.isArray(data.settings.stations) || data.settings.stations.length === 0) {
      data.settings.stations = DEFAULT_STATIONS;
    }

    // 24 saatten eski tarihçeyi temizle
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
