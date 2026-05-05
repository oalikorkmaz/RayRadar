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
