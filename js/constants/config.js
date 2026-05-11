// Fallback için statik sabit — state.settings.watchedStationId'ye taşındı
export const DEFAULT_WATCHED_STATION_ID = 'PAZA';

export const DEFAULT_SETTINGS = {
  preWarningMinutes: 3,
  soundEnabled: true,
  vibrationEnabled: true,
  dragRepositionEnabled: true,
  // 'all' = her trenin varışında uyarı  |  'watched' = sadece izlenen istasyona gelenlerde
  alertScope: 'all',
  watchedStationId: 'PAZA',
  // Özel ses dosyaları — base64 data URL veya null (varsayılan kullanılır)
  customSounds: {
    preArrival: null,
    arrival: null,
    collision: null,
  },
};

export const STORAGE_KEY = 'tren-izleme:v1';
export const SCHEMA_VERSION = 2;           // stations dinamik oldu, şema güncellendi
export const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 saat
