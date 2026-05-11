import { DEFAULT_STATIONS } from '../constants/stations.js';
import { validateDuration, validateRoute, validateTrainNumber } from '../models/Line.js';
import { getTrainDirection, createTrain } from '../models/Train.js';
import { predictCollisionOnAdd } from '../services/collision.js';

export function renderForm(container, state, dispatch) {
  const stations = state.settings?.stations || DEFAULT_STATIONS;
  const editing  = state.ui.editingTrain;
  const title    = editing ? 'Treni Düzenle' : 'Yeni Tren';
  const direction = editing ? getTrainDirection(editing, stations) : null;

  container.innerHTML = `
    <div class="modal-overlay" id="train-form-overlay">
      <form class="modal-card train-modal" id="train-form" novalidate>
        <div class="modal-header">
          <div>
            <p class="panel-kicker">${editing ? 'Güncelleme' : 'Kayıt'}</p>
            <h2>${title}</h2>
          </div>
          <div class="modal-header-actions">
            <span class="direction-pill ${direction || ''}" id="direction-pill">${directionLabel(direction)}</span>
            <button type="button" class="modal-x" id="form-close" aria-label="Kapat">×</button>
          </div>
        </div>

        <div class="form-grid">
          <label class="form-group">
            <span>Tren No</span>
            <input id="train-number" inputmode="numeric" maxlength="5" autocomplete="off"
              value="${editing?.trainNumber ?? ''}" ${editing ? 'readonly' : ''} />
            <small class="field-error" data-error-for="train-number"></small>
          </label>

          <div class="form-row">
            <label class="form-group">
              <span>Kalkış</span>
              <select id="from-station">${stationOptions(editing?.fromStation, '', stations)}</select>
              <small class="field-error" data-error-for="from-station"></small>
            </label>
            <label class="form-group">
              <span>Varış</span>
              <select id="to-station">${stationOptions(editing?.toStation, editing?.fromStation, stations)}</select>
              <small class="field-error" data-error-for="to-station"></small>
            </label>
          </div>

          <label class="form-group">
            <span>Süre</span>
            <input id="duration-min" type="number" min="1" max="999" value="${editing?.durationMin ?? ''}" />
            <small class="field-help" id="duration-help"></small>
            <small class="field-error" data-error-for="duration-min"></small>
          </label>
          <p class="form-error" id="form-error"></p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" id="form-cancel">Vazgeç</button>
          <button type="submit" class="btn btn-primary" id="form-save">Kaydet</button>
        </div>
      </form>
    </div>`;

  const form = container.querySelector('#train-form');
  const close = () => dispatch('CLOSE_FORM');
  const touched = new Set();

  container.querySelector('#form-close').addEventListener('click', close);
  container.querySelector('#form-cancel').addEventListener('click', close);
  container.querySelector('#train-form-overlay').addEventListener('click', event => {
    if (event.target.id === 'train-form-overlay') close();
  });

  ['train-number', 'from-station', 'to-station', 'duration-min'].forEach(id => {
    const field = container.querySelector(`#${id}`);
    field.addEventListener('blur', () => {
      touched.add(id);
      validateVisual(container, touched);
    });
    field.addEventListener('input', () => onFieldChange(container, state, touched, stations));
    field.addEventListener('change', () => onFieldChange(container, state, touched, stations));
  });

  container.querySelector('#from-station').addEventListener('change', () => {
    const from = container.querySelector('#from-station').value;
    const to   = container.querySelector('#to-station').value;
    container.querySelector('#to-station').innerHTML = stationOptions(to === from ? '' : to, from, stations);
  });

  onFieldChange(container, state, touched, stations);

  form.addEventListener('submit', event => {
    event.preventDefault();
    ['train-number', 'from-station', 'to-station', 'duration-min'].forEach(id => touched.add(id));
    const error = validateVisual(container, touched);
    const payload = readPayload(container);
    if (error) return;

    if (!editing && state.trains.some(t => t.trainNumber === payload.trainNumber)) {
      if (!confirm(`${payload.trainNumber} zaten takipte. Yine de eklensin mi?`)) return;
    }

    if (!editing) {
      const candidate = createTrain(payload);
      const collisions = predictCollisionOnAdd(candidate, state.trains);
      if (collisions.length && !confirm('Bu tren mevcut trenlerle çakışma riski oluşturabilir. Yine de eklensin mi?')) return;
    }

    dispatch(editing ? 'EDIT_TRAIN' : 'ADD_TRAIN', editing ? { ...payload, id: editing.id } : payload);
  });
}

function onFieldChange(container, state, touched, stations) {
  updateSuggestion(container, state);
  updateDirection(container, stations);
  validateVisual(container, touched);
}

function stationOptions(selected, excluded = '', stations = DEFAULT_STATIONS) {
  return `<option value="">Seçin</option>${stations
    .filter(station => station.id !== excluded)
    .map(station => `<option value="${station.id}" ${station.id === selected ? 'selected' : ''}>${station.label}</option>`)
    .join('')}`;
}

function readPayload(container) {
  return {
    trainNumber: container.querySelector('#train-number').value.trim(),
    fromStation: container.querySelector('#from-station').value,
    toStation: container.querySelector('#to-station').value,
    durationMin: Number(container.querySelector('#duration-min').value),
  };
}

function validateVisual(container, touched) {
  const payload = readPayload(container);
  const errors = {
    'train-number': validateTrainNumber(payload.trainNumber),
    'duration-min': validateDuration(payload.durationMin),
  };
  const route = validateRoute(payload.fromStation, payload.toStation);
  errors['from-station'] = !payload.fromStation ? { valid: false, error: route.error } : { valid: true, error: null };
  errors['to-station'] = !payload.toStation || payload.fromStation === payload.toStation ? { valid: false, error: route.error } : { valid: true, error: null };

  Object.entries(errors).forEach(([id, result]) => {
    const el = container.querySelector(`[data-error-for="${id}"]`);
    if (el) el.textContent = touched.has(id) && !result.valid ? result.error : '';
  });

  const firstError = Object.values(errors).find(result => !result.valid);
  container.querySelector('#form-save').disabled = Boolean(firstError);
  container.querySelector('#form-error').textContent = touched.size && firstError ? firstError.error : '';
  return firstError?.error ?? '';
}

function updateSuggestion(container, state) {
  const from = container.querySelector('#from-station').value;
  const to = container.querySelector('#to-station').value;
  const help = container.querySelector('#duration-help');
  const duration = container.querySelector('#duration-min');
  const suggestion = state.segmentTimes[`${from}->${to}`];

  duration.placeholder = suggestion ? String(suggestion) : '';
  help.textContent = suggestion ? `Önceki kayıt: ${suggestion} dk` : '1-999 dakika arasında girin';
}

function updateDirection(container, stations = DEFAULT_STATIONS) {
  const from = stations.find(s => s.id === container.querySelector('#from-station').value);
  const to   = stations.find(s => s.id === container.querySelector('#to-station').value);
  const pill = container.querySelector('#direction-pill');
  let direction = '';
  if (from && to) direction = to.index > from.index ? 'east' : 'west';
  pill.className = `direction-pill ${direction}`;
  pill.textContent = directionLabel(direction);
}

function directionLabel(direction) {
  if (direction === 'east') return 'DOĞU';
  if (direction === 'west') return 'BATI';
  return 'YÖN';
}
