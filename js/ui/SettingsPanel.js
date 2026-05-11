import { clearHistory } from '../services/storage.js';
import { getNotificationPermission, requestNotificationPermission } from '../services/notification.js';
import { DEFAULT_STATIONS, reindexStations, slugify } from '../constants/stations.js';
import { DEFAULT_WATCHED_STATION_ID } from '../constants/config.js';

export function renderSettings(container, state, dispatch) {
  const settings   = state.settings;
  const stations   = settings.stations || DEFAULT_STATIONS;
  const watchedId  = settings.watchedStationId || DEFAULT_WATCHED_STATION_ID;
  const alertScope = settings.alertScope || 'all';
  const sounds     = settings.customSounds || {};
  const permission = getNotificationPermission();

  container.innerHTML = `
    <div class="modal-overlay" id="settings-overlay">
      <div class="modal-card settings-card">

        <div class="modal-header">
          <div>
            <p class="panel-kicker">Yapılandırma</p>
            <h2>Ayarlar</h2>
          </div>
          <button class="modal-x" id="settings-close" aria-label="Kapat">×</button>
        </div>

        <!-- Benim İstasyonum -->
        <div class="settings-block">
          <span class="settings-label">Benim İstasyonum</span>
          <p class="settings-note">Uyarı hesaplamalarının yapılacağı istasyon.</p>
          <select id="s-watched" class="settings-select">
            ${stations.map(s => `
              <option value="${s.id}" ${s.id === watchedId ? 'selected' : ''}>${s.label}</option>
            `).join('')}
          </select>
        </div>

        <!-- Uyarı Kapsamı -->
        <div class="settings-block">
          <span class="settings-label">Uyarı Kapsamı</span>
          <p class="settings-note">Alarm ve bildirimler hangi trenler için çalışsın?</p>
          <div class="radio-group">
            <label class="toggle-label">
              <input type="radio" name="alert-scope" value="all" ${alertScope === 'all' ? 'checked' : ''} />
              <span>Tüm trenler — her varışta uyarı ver</span>
            </label>
            <label class="toggle-label">
              <input type="radio" name="alert-scope" value="watched" ${alertScope === 'watched' ? 'checked' : ''} />
              <span>Sadece benim istasyonum — yalnızca ${stations.find(s => s.id === watchedId)?.label ?? watchedId}'a gelenlerde</span>
            </label>
          </div>
        </div>

        <!-- Genel Ayarlar -->
        <div class="settings-block">
          <span class="settings-label">Genel</span>
          <label class="form-group">
            <span style="color:var(--txt-2);font-size:13px">Önceden uyarı süresi</span>
            <div class="inline-control">
              <input id="s-prewarn" type="number" min="1" max="10" value="${settings.preWarningMinutes ?? 3}" />
              <span style="color:var(--txt-2);font-size:13px">dakika önce</span>
            </div>
          </label>
          <label class="toggle-label">
            <input type="checkbox" id="s-sound" ${settings.soundEnabled ? 'checked' : ''} />
            <span>Sesli uyarılar</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" id="s-vibrate" ${settings.vibrationEnabled ? 'checked' : ''} />
            <span>Titreşim (mobil)</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" id="s-drag" ${settings.dragRepositionEnabled !== false ? 'checked' : ''} />
            <span>Treni sürükleyerek konumlandır</span>
          </label>
        </div>

        <!-- Özel Ses Dosyaları -->
        <div class="settings-block">
          <span class="settings-label">Alarm Sesleri</span>
          <p class="settings-note">MP3 veya WAV yükleyin. Boş bırakırsanız varsayılan sesler kullanılır.</p>
          ${soundRow('preArrival', 'Önceden uyarı', sounds.preArrival)}
          ${soundRow('arrival',    'Varış alarmı',  sounds.arrival)}
          ${soundRow('collision',  'Çakışma uyarısı', sounds.collision)}
        </div>

        <!-- Bildirimler -->
        <div class="settings-block">
          <span class="settings-label">Bildirimler</span>
          <p class="settings-note">Durum: <strong>${permissionLabel(permission)}</strong></p>
          ${permission !== 'granted'
            ? '<button class="btn btn-ghost btn-sm" id="s-req-notif">İzin İste</button>'
            : ''}
        </div>

        <!-- İstasyon Yönetimi -->
        <div class="settings-block">
          <span class="settings-label">Hat Yönetimi</span>
          <p class="settings-note">İstasyonları ekleyip kaldırabilir, hat'ı özelleştirebilirsiniz.</p>
          <div class="station-manage-list" id="station-manage-list">
            ${stationManageRows(stations, watchedId)}
          </div>
          <div class="add-station-row">
            <input id="new-station-label" class="settings-input" placeholder="Yeni istasyon adı" maxlength="30" />
            <select id="new-station-after" class="settings-select-sm">
              <option value="-1">Başa ekle</option>
              ${stations.map((s, i) => `<option value="${i}">${s.label} sonrasına</option>`).join('')}
            </select>
            <button class="btn btn-ghost btn-sm" id="add-station-btn">+ Ekle</button>
          </div>
        </div>

        <!-- Tarihçe -->
        <div class="settings-block">
          <span class="settings-label">Tarihçe</span>
          <button class="btn btn-danger btn-sm" id="s-clear-history">Tarihçeyi Temizle</button>
        </div>

        <div class="modal-footer" style="margin-top:20px">
          <button class="btn btn-ghost" id="settings-cancel">Vazgeç</button>
          <button class="btn btn-primary" id="s-save">Kaydet</button>
        </div>
      </div>
    </div>`;

  // Kapat
  const close = () => dispatch('TOGGLE_SETTINGS');
  container.querySelector('#settings-close').addEventListener('click', close);
  container.querySelector('#settings-cancel').addEventListener('click', close);
  container.querySelector('#settings-overlay').addEventListener('click', e => {
    if (e.target.id === 'settings-overlay') close();
  });

  // Ses dosyası yükleme
  ['preArrival', 'arrival', 'collision'].forEach(type => {
    container.querySelector(`#sound-upload-${type}`)?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      dispatch('UPDATE_CUSTOM_SOUND', { type, dataUrl });
      container.querySelector(`#sound-status-${type}`).textContent = `✓ ${file.name}`;
    });
    container.querySelector(`#sound-clear-${type}`)?.addEventListener('click', () => {
      dispatch('UPDATE_CUSTOM_SOUND', { type, dataUrl: null });
      container.querySelector(`#sound-status-${type}`).textContent = 'Varsayılan';
      const inp = container.querySelector(`#sound-upload-${type}`);
      if (inp) inp.value = '';
    });
  });

  // Bildirim izni
  container.querySelector('#s-req-notif')?.addEventListener('click', async () => {
    await requestNotificationPermission();
    dispatch('TOGGLE_SETTINGS');
    dispatch('TOGGLE_SETTINGS');
  });

  // İstasyon silme
  container.querySelectorAll('[data-remove-station]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.removeStation;
      const st = stations.find(s => s.id === id);
      if (!st) return;
      if (!confirm(`"${st.label}" istasyonunu hat'tan kaldır? Bu istasyona atanmış aktif trenler silinecek.`)) return;
      dispatch('REMOVE_STATION', { id });
    });
  });

  // İstasyon ekleme
  container.querySelector('#add-station-btn')?.addEventListener('click', () => {
    const label = container.querySelector('#new-station-label').value.trim();
    if (!label) { alert('İstasyon adı girin.'); return; }
    const afterVal = Number(container.querySelector('#new-station-after').value);
    dispatch('ADD_STATION', { label, insertAfterIndex: afterVal });
    container.querySelector('#new-station-label').value = '';
  });

  // Tarihçe temizle
  container.querySelector('#s-clear-history').addEventListener('click', () => {
    if (!confirm('Tüm tarihçe silinsin mi?')) return;
    clearHistory();
    location.reload();
  });

  // Kaydet
  container.querySelector('#s-save').addEventListener('click', () => {
    const preWarningMinutes = Number(container.querySelector('#s-prewarn').value);
    const alertScopeVal = container.querySelector('[name="alert-scope"]:checked')?.value || 'all';
    dispatch('UPDATE_SETTINGS', {
      watchedStationId:       container.querySelector('#s-watched').value,
      preWarningMinutes:      Number.isInteger(preWarningMinutes) && preWarningMinutes >= 1 ? preWarningMinutes : 3,
      alertScope:             alertScopeVal,
      soundEnabled:           container.querySelector('#s-sound').checked,
      vibrationEnabled:       container.querySelector('#s-vibrate').checked,
      dragRepositionEnabled:  container.querySelector('#s-drag').checked,
    });
    close();
  });
}

// ─── Yardımcı ──────────────────────────────────────────────────────────────

function soundRow(type, label, currentDataUrl) {
  const hasCustom = Boolean(currentDataUrl);
  return `
    <div class="sound-row">
      <span class="sound-label">${label}</span>
      <label class="btn btn-ghost btn-sm sound-upload-label">
        📂 Seç
        <input type="file" id="sound-upload-${type}" accept="audio/*" class="sr-only" />
      </label>
      <span class="sound-status" id="sound-status-${type}">${hasCustom ? '✓ Özel' : 'Varsayılan'}</span>
      ${hasCustom
        ? `<button class="btn btn-ghost btn-sm" id="sound-clear-${type}" title="Varsayılana dön">✕</button>`
        : `<span id="sound-clear-${type}"></span>`}
    </div>`;
}

function stationManageRows(stations, watchedId) {
  if (stations.length === 0) return '<p class="settings-note">Hat boş.</p>';
  return `<div class="station-rows">${stations.map(s => `
    <div class="station-row">
      <span class="station-row-index">${s.index}</span>
      <span class="station-row-label ${s.id === watchedId ? 'station-watched' : ''}">${s.label}</span>
      ${s.id === watchedId
        ? '<span class="station-row-badge">İzlenen</span>'
        : `<button class="btn btn-ghost btn-sm station-row-remove" data-remove-station="${s.id}" title="Kaldır">−</button>`}
    </div>`).join('')}</div>`;
}

function permissionLabel(perm) {
  return {
    granted:     'İzin verildi ✓',
    denied:      'Reddedildi ✗',
    default:     'İstenmedi',
    unavailable: 'Desteklenmiyor',
  }[perm] ?? perm;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
