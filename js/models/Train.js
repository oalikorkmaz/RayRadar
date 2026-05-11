import { getStationById, DEFAULT_STATIONS } from '../constants/stations.js';

export function createTrain({ trainNumber, fromStation, toStation, durationMin }) {
  return {
    id: crypto.randomUUID(),
    trainNumber: String(trainNumber),
    fromStation,
    toStation,
    durationMin: Number(durationMin),
    startedAt: Date.now(),
    status: 'active',
    arrivedAt: null,
    preWarningFired: false,
  };
}

export function getTrainProgress(train) {
  const elapsedMs = Date.now() - train.startedAt;
  const totalMs = train.durationMin * 60_000;
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

// Dinamik durak listesiyle pozisyon hesapla (varsayılan: DEFAULT_STATIONS)
export function getTrainPosition(train, stations = DEFAULT_STATIONS) {
  const from = getStationById(train.fromStation, stations);
  const to   = getStationById(train.toStation,   stations);
  if (!from || !to) return null;
  const progress = getTrainProgress(train);
  return from.index + progress * (to.index - from.index);
}

// Dinamik durak listesiyle yön hesapla
export function getTrainDirection(train, stations = DEFAULT_STATIONS) {
  const from = getStationById(train.fromStation, stations);
  const to   = getStationById(train.toStation,   stations);
  if (!from || !to) return null;
  return to.index > from.index ? 'east' : 'west';
}
