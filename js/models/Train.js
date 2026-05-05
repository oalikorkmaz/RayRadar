import { getStationById } from '../constants/stations.js';

export function createTrain({ trainNumber, fromStation, toStation, durationMin }) {
  return {
    id: crypto.randomUUID(),
    trainNumber: String(trainNumber),
    fromStation,
    toStation,
    durationMin: Number(durationMin),
    startedAt: Date.now(),
    status: 'active',         // 'active' | 'arrived' | 'manual_arrived' | 'deleted'
    arrivedAt: null,
    preWarningFired: false,
  };
}

export function getTrainProgress(train) {
  const elapsedMs = Date.now() - train.startedAt;
  const totalMs = train.durationMin * 60_000;
  return Math.min(1, Math.max(0, elapsedMs / totalMs));
}

// Returns floating-point position on the 0–8 index scale
export function getTrainPosition(train) {
  const from = getStationById(train.fromStation);
  const to = getStationById(train.toStation);
  if (!from || !to) return null;
  const progress = getTrainProgress(train);
  return from.index + progress * (to.index - from.index);
}

// 'east' = index increasing, 'west' = index decreasing
export function getTrainDirection(train) {
  const from = getStationById(train.fromStation);
  const to = getStationById(train.toStation);
  if (!from || !to) return null;
  return to.index > from.index ? 'east' : 'west';
}
