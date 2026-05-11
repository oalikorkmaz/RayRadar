import { DEFAULT_STATIONS as STATIONS, getStationById } from '../constants/stations.js';

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
