import { getStationById } from '../constants/stations.js';
import { minutesRemaining } from '../services/time.js';

export function renderStaleModal(container, state, dispatch) {
  const stale = state.ui.staleTrains || [];
  const staleIds = stale.map(t => t.id);

  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Suresi Gecmis Trenler</h2>
        </div>
        <p class="modal-copy">Uygulama kapaliyken bu trenlerin varis suresi doldu.</p>
        <div class="stale-list">
          ${stale.map(t => staleRow(t)).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="stale-ignore-all">Hepsini Yoksay</button>
          <button class="btn btn-primary" id="stale-add-all">Hepsini Tarihceye Ekle</button>
        </div>
      </div>
    </div>`;

  container.querySelector('#stale-add-all').addEventListener('click', () => {
    dispatch('RESOLVE_STALE_TRAINS', { action: 'addAll', trains: staleIds });
  });
  container.querySelector('#stale-ignore-all').addEventListener('click', () => {
    dispatch('RESOLVE_STALE_TRAINS', { action: 'ignore', trains: staleIds });
  });
  container.querySelectorAll('[data-resolve]').forEach(button => {
    button.addEventListener('click', () => {
      dispatch('RESOLVE_ONE_STALE', {
        id: button.dataset.id,
        resolution: button.dataset.resolve === 'add' ? 'add' : 'ignore',
      });
    });
  });
}

function staleRow(train) {
  const from = getStationById(train.fromStation);
  const to = getStationById(train.toStation);
  const overMin = Math.abs(Math.round(minutesRemaining(train.startedAt, train.durationMin)));

  return `
    <div class="stale-row">
      <span class="stale-number">${train.trainNumber}</span>
      <span class="stale-route">${from?.label ?? train.fromStation} -> ${to?.label ?? train.toStation}</span>
      <span class="stale-over">${overMin} dk once</span>
      <button class="btn btn-ghost btn-sm" data-resolve="add" data-id="${train.id}">Ekle</button>
      <button class="btn btn-sm muted-button" data-resolve="ignore" data-id="${train.id}">Yoksay</button>
    </div>`;
}
