// Varsayılan hat — localStorage'da kullanıcı tarafından değiştirilebilir.
// Bileşenler state.settings.stations kullanmalı, bu sabiti değil.
export const DEFAULT_STATIONS = [
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

// Geriye dönük uyum için — doğrudan kullanmak yerine state.settings.stations tercih edin
export const STATIONS = DEFAULT_STATIONS;
export const STATION_COUNT = DEFAULT_STATIONS.length;
export const SEGMENT_COUNT = DEFAULT_STATIONS.length - 1;

export function getStationById(id, stations = DEFAULT_STATIONS) {
  return stations.find(s => s.id === id) ?? null;
}

export function getStationByIndex(index, stations = DEFAULT_STATIONS) {
  return stations[index] ?? null;
}

/** Durak listesini yeniden indeksler (ekleme/kaldırma sonrası çağrılır) */
export function reindexStations(stations) {
  return stations.map((s, i) => ({ ...s, index: i }));
}

/** ID için benzersiz bir slug üretir (Türkçe → ASCII) */
export function slugify(label) {
  return label
    .toUpperCase()
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6) || 'STN';
}

