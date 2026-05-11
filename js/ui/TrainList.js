import { trainCardHTML } from './TrainCard.js';
import { minutesRemaining } from '../services/time.js';

export function renderTrainList(container, state, dispatch) {
  const stations  = state.settings?.stations;
  const watchedId = state.settings?.watchedStationId;
  const active = [...state.trains].sort(
    (a, b) => minutesRemaining(a.startedAt, a.durationMin) - minutesRemaining(b.startedAt, b.durationMin)
  );
  const history = [...state.history].sort((a, b) => (b.endedAt || b.arrivedAt || 0) - (a.endedAt || a.arrivedAt || 0));
  const tab = state.ui.activeTab;

  container.innerHTML = `
    <section class="list-panel">
      <div class="list-toolbar">
        <div class="segmented-tabs" role="tablist">
          <button class="tab ${tab === 'active' ? 'active' : ''}" data-tab="active">
            Aktif <span>${active.length}</span>
          </button>
          <button class="tab ${tab === 'history' ? 'active' : ''}" data-tab="history">
            Tarihçe <span>${history.length}</span>
          </button>
        </div>
        <div class="list-tools">
          <span class="sort-chip">Kalan süreye göre</span>
          <button class="btn btn-primary" id="add-train">+ Yeni</button>
        </div>
      </div>
      <div class="card-grid">
        ${tab === 'active' ? renderActive(active, stations, watchedId) : renderHistory(history, stations, watchedId)}
      </div>
    </section>`;

  container.querySelector('#add-train').addEventListener('click', () => dispatch('OPEN_FORM'));
  container.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => dispatch('SET_TAB', { tab: button.dataset.tab }));
  });
  container.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const train = state.trains.find(t => t.id === id);
      if (button.dataset.action === 'edit') dispatch('OPEN_FORM', { train });
      if (button.dataset.action === 'arrived') dispatch('MANUAL_ARRIVED', { id });
      if (button.dataset.action === 'delete' && confirm(`Tren ${train?.trainNumber ?? ''} silinsin mi?`)) {
        dispatch('DELETE_TRAIN', { id });
      }
    });
  });
}

function renderActive(trains, stations, watchedId) {
  if (!trains.length) return '<div class="empty-state">Aktif tren yok. Yeni tren ekleyerek hattı izlemeye başlayın.</div>';
  return trains.map(train => trainCardHTML(train, 'active', stations, watchedId)).join('');
}

function renderHistory(history, stations, watchedId) {
  if (!history.length) return '<div class="empty-state">Tarihçe henüz boş.</div>';
  return history.map(train => trainCardHTML(train, 'history', stations, watchedId)).join('');
}
