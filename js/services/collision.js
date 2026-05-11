import { getTrainDirection, getTrainPosition } from '../models/Train.js';
import { getStationById, DEFAULT_STATIONS, SEGMENT_COUNT } from '../constants/stations.js';

/**
 * Future-path collision detection for opposite-direction trains.
 * A risk exists when an eastbound train is left of a westbound train and
 * their remaining route intervals overlap.
 */
export function detectCollisions(trains, stations = DEFAULT_STATIONS) {
  const active = trains.filter(t => t.status === 'active');
  const collisions = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const risk = collisionBetween(active[i], active[j], stations);
      if (risk) collisions.push(risk);
    }
  }

  return collisions;
}

export function predictCollisionOnAdd(newTrain, existingTrains, stations = DEFAULT_STATIONS) {
  return detectCollisions([newTrain, ...existingTrains], stations);
}

function collisionBetween(a, b, stations) {
  const dirA = getTrainDirection(a, stations);
  const dirB = getTrainDirection(b, stations);
  if (!dirA || !dirB || dirA === dirB) return null;

  const left  = dirA === 'east' ? a : b;
  const right = dirA === 'east' ? b : a;
  const leftPos  = getTrainPosition(left,  stations);
  const rightPos = getTrainPosition(right, stations);
  const leftTo   = getStationById(left.toStation,   stations);
  const rightTo  = getStationById(right.toStation,  stations);
  const leftFrom = getStationById(left.fromStation, stations);
  const rightFrom= getStationById(right.fromStation,stations);

  if ([leftPos, rightPos].some(v => v === null) || !leftTo || !rightTo || !leftFrom || !rightFrom) return null;
  if (leftPos >= rightPos) return null;
  if (leftTo.index <= rightTo.index) return null;

  const speedLeft  = Math.abs(leftTo.index  - leftFrom.index)  / left.durationMin;
  const speedRight = Math.abs(rightTo.index - rightFrom.index) / right.durationMin;
  const combinedSpeed = speedLeft + speedRight;
  if (combinedSpeed <= 0) return null;

  const estimatedMinutes = Math.max(0, Math.round((rightPos - leftPos) / combinedSpeed));
  const meet = (leftPos + rightPos) / 2;
  const segCount = stations.length - 1;
  const segmentIndex = Math.max(0, Math.min(segCount - 1, Math.floor(meet)));

  return { segmentIndex, trainA: a, trainB: b, estimatedMinutes };
}
