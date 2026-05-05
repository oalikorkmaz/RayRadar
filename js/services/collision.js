import { getTrainPosition, getTrainDirection } from '../models/Train.js';
import { getSegmentIndex } from '../models/Line.js';
import { getStationById } from '../constants/stations.js';

/**
 * Returns array of collision objects for the given active train list.
 * { segmentIndex, trainA, trainB, estimatedMinutes }
 */
export function detectCollisions(trains) {
  const active = trains.filter(t => t.status === 'active');
  const collisions = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      const posA = getTrainPosition(a);
      const posB = getTrainPosition(b);
      const dirA = getTrainDirection(a);
      const dirB = getTrainDirection(b);

      if (posA === null || posB === null) continue;
      if (dirA === dirB) continue; // same direction → no collision risk

      const segA = getSegmentIndex(posA);
      const segB = getSegmentIndex(posB);
      if (segA !== segB) continue; // different segments

      // Same segment, opposite directions → collision risk
      const estMinutes = estimateMeetingMinutes(a, b, posA, posB);

      collisions.push({ segmentIndex: segA, trainA: a, trainB: b, estimatedMinutes: estMinutes });
    }
  }

  return collisions;
}

/**
 * Check if adding newTrain would cause collisions with existingTrains.
 * Returns collision array (empty = safe).
 */
export function predictCollisionOnAdd(newTrain, existingTrains) {
  return detectCollisions([newTrain, ...existingTrains]);
}

function estimateMeetingMinutes(a, b, posA, posB) {
  const fromA = getStationById(a.fromStation);
  const toA   = getStationById(a.toStation);
  const fromB = getStationById(b.fromStation);
  const toB   = getStationById(b.toStation);

  if (!fromA || !toA || !fromB || !toB) return 0;

  // Speed = distance (in index units) per minute
  const distA = Math.abs(toA.index - fromA.index);
  const distB = Math.abs(toB.index - fromB.index);
  const speedA = distA / a.durationMin;   // index/min
  const speedB = distB / b.durationMin;

  const combinedSpeed = speedA + speedB;
  if (combinedSpeed === 0) return 0;

  return Math.round(Math.abs(posA - posB) / combinedSpeed);
}
