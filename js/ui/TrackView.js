import { DEFAULT_STATIONS } from '../constants/stations.js';
import { DEFAULT_WATCHED_STATION_ID } from '../constants/config.js';
import { getTrainDirection, getTrainPosition } from '../models/Train.js';
import { minutesRemaining, formatMinutes } from '../services/time.js';

const VIEW_W = 1160;
const VIEW_H = 300;
const PAD_L = 60;
const PAD_R = 60;
const RAIL_Y = 165;

export function renderTrackView(container, state, dispatch) {
  const stations        = state.settings?.stations || DEFAULT_STATIONS;
  const watchedId       = state.settings?.watchedStationId || DEFAULT_WATCHED_STATION_ID;
  const segCount        = stations.length - 1;
  const collisionSegments = new Set((state.ui.collisions || []).map(c => c.segmentIndex));
  const dragEnabled     = state.settings?.dragRepositionEnabled !== false;

  container.innerHTML = `
    <section class="track-panel">
      <div class="panel-title-row">
        <div>
          <p class="panel-kicker">Hat görünümü</p>
          <h2>Türkoğlu - Gölbaşı tek hat</h2>
        </div>
        <div class="track-summary">
          <span>${state.trains.length} aktif</span>
          <span>${collisionSegments.size} kritik segment</span>
        </div>
      </div>
      <div class="track-stage">
        <svg class="track-svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" role="img" aria-label="Tren hattı">
          ${renderRails(collisionSegments, segCount)}
          ${renderStations(stations, watchedId, segCount)}
        </svg>
        <div class="track-trains">
          ${state.trains.map(train => trainMarker(train, dragEnabled, stations, watchedId, segCount)).join('')}
        </div>
      </div>
    </section>`;

  bindTrainInteractions(container, state, dispatch, stations, segCount);
}

function renderRails(collisionSegments, segCount) {
  const normalSegments = [];
  const criticalSegments = [];

  for (let i = 0; i < segCount; i++) {
    const x1 = stationX(i, segCount);
    const x2 = stationX(i + 1, segCount);
    const target = collisionSegments.has(i) ? criticalSegments : normalSegments;
    target.push(`
      <g class="${collisionSegments.has(i) ? 'rail-risk' : 'rail-normal'}" data-segment-index="${i}">
        <line x1="${x1}" y1="${RAIL_Y - 3}" x2="${x2}" y2="${RAIL_Y - 3}" />
        <line x1="${x1}" y1="${RAIL_Y + 3}" x2="${x2}" y2="${RAIL_Y + 3}" />
      </g>`);
  }

  return `
    ${normalSegments.join('')}
    ${criticalSegments.join('')}
    ${Array.from(collisionSegments).map(index => `
      <g class="collision-glyph" transform="translate(${(stationX(index, segCount) + stationX(index + 1, segCount)) / 2} ${RAIL_Y - 50})">
        <path d="M0 -13 L14 13 H-14 Z"></path>
        <text y="7" text-anchor="middle">!</text>
      </g>`).join('')}`;
}

function renderStations(stations, watchedId, segCount) {
  return stations.map(station => {
    const watched = station.id === watchedId;
    const x = stationX(station.index, segCount);
    return `
      <g class="station-node ${watched ? 'watched' : ''}" data-station-id="${station.id}" transform="translate(${x} ${RAIL_Y})">
        ${watched
          ? '<circle r="13" class="station-ring"></circle><circle r="5" class="station-core"></circle>'
          : '<circle r="6" class="station-dot"></circle>'}
        <text class="station-label" y="48" text-anchor="middle">${station.label}</text>
        ${watched ? '<text class="station-mini" y="66" text-anchor="middle">İZLENEN</text>' : ''}
      </g>`;
  }).join('');
}

function trainMarker(train, dragEnabled, stations, watchedId, segCount) {
  const position  = getTrainPosition(train, stations);
  const direction = getTrainDirection(train, stations);
  const remaining = minutesRemaining(train.startedAt, train.durationMin);
  const stateClass = remaining <= 0.05
    ? 'crit'
    : remaining <= 3
      ? 'warn'
      : direction;
  const x = position === null ? PAD_L : PAD_L + (position / segCount) * (VIEW_W - PAD_L - PAD_R);
  const route = routeLabel(train, stations);

  return `
    <div class="topdown-train ${direction || ''} ${stateClass || ''} ${dragEnabled ? '' : 'no-drag'}"
      data-train-id="${train.id}"
      role="button"
      tabindex="0"
      title="${dragEnabled ? 'Düzenlemek için tıkla, istasyona taşımak için sürükle' : 'Düzenlemek için tıkla'}"
      style="left:${x}px; top:${RAIL_Y - 42}px">
      ${direction === 'west' ? chip(train, remaining, route) : ''}
      ${trainSvg(direction)}
      ${direction === 'west' ? '' : chip(train, remaining, route)}
    </div>`;
}

function chip(train, remaining, route) {
  return `
    <div class="train-chip">
      <span class="chip-number">${train.trainNumber}</span>
      <i></i>
      <strong class="chip-time">${formatMinutes(remaining)}</strong>
    </div>
    <div class="route-mini">${route}</div>`;
}

function trainSvg(direction) {
  return `
    <svg class="train-shape" viewBox="0 0 64 22" aria-hidden="true">
      <ellipse cx="32" cy="20" rx="26" ry="3" class="train-shadow"></ellipse>
      <g class="${direction === 'west' ? 'flip' : ''}">
        <path class="train-body" d="M4 5 H46 L58 11 L46 17 H4 Q1 17 1 14 V8 Q1 5 4 5 Z"></path>
        <path class="train-roof" d="M5 5 H46 L58 11"></path>
        <rect class="train-window" x="8" y="8" width="6" height="5" rx="1.5"></rect>
        <rect class="train-window" x="18" y="8" width="6" height="5" rx="1.5"></rect>
        <rect class="train-window" x="28" y="8" width="6" height="5" rx="1.5"></rect>
        <path class="cab-window" d="M45 8 L54 11 L45 14 Z"></path>
        <circle class="headlight" cx="58" cy="11" r="1.5"></circle>
      </g>
    </svg>`;
}

function routeLabel(train, stations) {
  const from = stations.find(s => s.id === train.fromStation);
  const to   = stations.find(s => s.id === train.toStation);
  return `${from?.label ?? train.fromStation} &rarr; ${to?.label ?? train.toStation}`;
}

function bindTrainInteractions(container, state, dispatch, stations, segCount) {
  if (!dispatch) return;

  container.querySelectorAll('.topdown-train').forEach(el => {
    el.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const train = state.trains.find(t => t.id === el.dataset.trainId);
      if (train) dispatch('OPEN_FORM', { train });
    });

    el.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();

      const train = state.trains.find(t => t.id === el.dataset.trainId);
      const stage = container.querySelector('.track-stage');
      if (!train || !stage) return;

      const dragEnabled = state.settings?.dragRepositionEnabled !== false;
      const startX = event.clientX;
      const startY = event.clientY;
      let dragging = false;
      let lastStation = null;

      el.setPointerCapture?.(event.pointerId);

      const onMove = moveEvent => {
        if (!dragEnabled) return;

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) < 7) return;

        dragging = true;
        el.classList.add('dragging');
        stage.classList.add('drag-active');

        const viewX = pointerToViewX(stage, moveEvent.clientX);
        const clamped = Math.max(PAD_L, Math.min(VIEW_W - PAD_R, viewX));
        el.style.left = `${clamped}px`;

        const station = nearestStation(clamped, stations, segCount);
        if (station?.id !== lastStation?.id) {
          if (lastStation) {
            container.querySelector(`[data-station-id="${lastStation.id}"]`)?.classList.remove('drop-target');
          }
          lastStation = station;
          container.querySelector(`[data-station-id="${station.id}"]`)?.classList.add('drop-target');
        }
      };

      const finish = upEvent => {
        cleanup();

        if (dragging) {
          const viewX = pointerToViewX(stage, upEvent.clientX);
          const station = nearestStation(Math.max(PAD_L, Math.min(VIEW_W - PAD_R, viewX)), stations, segCount);
          if (station) dispatch('REPOSITION_TRAIN', { id: train.id, fromStation: station.id });
          return;
        }

        dispatch('OPEN_FORM', { train });
      };

      const cancel = () => cleanup();

      const cleanup = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', finish);
        document.removeEventListener('pointercancel', cancel);
        el.releasePointerCapture?.(event.pointerId);
        el.classList.remove('dragging');
        stage.classList.remove('drag-active');
        if (lastStation) {
          container.querySelector(`[data-station-id="${lastStation.id}"]`)?.classList.remove('drop-target');
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', finish);
      document.addEventListener('pointercancel', cancel);
    });
  });
}

function pointerToViewX(stage, clientX) {
  const rect = stage.getBoundingClientRect();
  const xInStage = clientX - rect.left + stage.scrollLeft;
  return (xInStage / stage.scrollWidth) * VIEW_W;
}

function nearestStation(x, stations, segCount) {
  return stations.reduce((best, station) => {
    const distance = Math.abs(stationX(station.index, segCount) - x);
    if (!best || distance < best.distance) return { ...station, distance };
    return best;
  }, null);
}

function stationX(index, segCount) {
  return PAD_L + (index / segCount) * (VIEW_W - PAD_L - PAD_R);
}
