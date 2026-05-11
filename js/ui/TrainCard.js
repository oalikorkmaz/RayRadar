import { DEFAULT_WATCHED_STATION_ID } from '../constants/config.js';
import { getStationById, DEFAULT_STATIONS } from '../constants/stations.js';
import { getTrainDirection, getTrainProgress } from '../models/Train.js';
import { minutesRemaining, formatMinutes, formatTime } from '../services/time.js';

export function trainCardHTML(train, mode = 'active', stations = DEFAULT_STATIONS, watchedId = DEFAULT_WATCHED_STATION_ID) {
  const from = getStationById(train.fromStation, stations);
  const to   = getStationById(train.toStation,   stations);
  const direction = getTrainDirection(train, stations);
  const remaining = minutesRemaining(train.startedAt, train.durationMin);
  const status = remaining <= 0.05 ? 'crit' : remaining <= 3 ? 'warn' : direction;

  if (mode === 'history') {
    return `
      <article class="train-card history-card" data-train-id="${train.id}">
        <div class="card-accent"></div>
        <div class="card-main-row">
          <span class="card-number">${train.trainNumber}</span>
          <span class="history-status">${historyLabel(train)} ${formatTime(train.endedAt || train.arrivedAt || Date.now())}</span>
        </div>
        <p class="card-route">${stationLabel(from, train.fromStation)} → ${stationLabel(to, train.toStation)}</p>
      </article>`;
  }

  const progress = Math.round(getTrainProgress(train) * 100);

  return `
    <article class="train-card ${status || ''}" data-train-id="${train.id}">
      <div class="card-accent"></div>
      <div class="card-main-row">
        <span class="card-number">${train.trainNumber}</span>
        <span class="countdown">${formatMinutes(remaining)}</span>
      </div>
      <p class="card-route">
        ${routePart(from, train.fromStation, watchedId)}
        <span>→</span>
        ${routePart(to, train.toStation, watchedId)}
      </p>
      <div class="card-progress" aria-hidden="true">
        <span style="width:${progress}%"></span>
      </div>
      <div class="card-actions">
        <button class="card-action" data-action="edit" data-id="${train.id}">Düzenle</button>
        <button class="card-action" data-action="arrived" data-id="${train.id}">Vardı</button>
        <button class="card-action danger" data-action="delete" data-id="${train.id}">Sil</button>
      </div>
    </article>`;
}

function routePart(station, fallback, watchedId) {
  const label = stationLabel(station, fallback);
  return `<strong class="${station?.id === watchedId ? 'watched-route' : ''}">${label}</strong>`;
}

function stationLabel(station, fallback) {
  return station?.label ?? fallback;
}

function historyLabel(train) {
  if (train.status === 'manual_arrived') return '✓ Vardı';
  if (train.status === 'deleted') return 'Silindi';
  return '✓ Vardı';
}
