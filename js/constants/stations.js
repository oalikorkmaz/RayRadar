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
