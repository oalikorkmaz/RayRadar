import { unlockAudio } from '../services/audio.js';
import { requestNotificationPermission } from '../services/notification.js';
import { vibrate } from '../services/vibration.js';
import { DEFAULT_STATIONS } from '../constants/stations.js';

/**
 * İlk açılış ekranı — 2 adım:
 *  1. İzin hazırlığı (ses, bildirim, titreşim)
 *  2. Hangi istasyondasınız? (izlenen durak)
 */
export function renderFirstLaunch(container, dispatch) {
  showPermissionStep(container, dispatch);
}

function showPermissionStep(container, dispatch) {
  container.innerHTML = `
    <section class="first-launch">
      <div class="first-launch-panel">
        <p class="eyebrow">Pazarcık Hat İzleme</p>
        <h1>Tren İzleme</h1>
        <p class="first-launch-copy">
          Sesli uyarılar, ekran bildirimleri ve titreşim izinlerini hazırlayıp sistemi başlatın.
        </p>
        <button class="btn btn-primary first-launch-btn" id="start-system">Sistemi Başlat</button>
        <p class="first-launch-note" id="first-launch-note"></p>
      </div>
    </section>`;

  container.querySelector('#start-system').addEventListener('click', async () => {
    const btn  = container.querySelector('#start-system');
    const note = container.querySelector('#first-launch-note');
    btn.disabled = true;
    btn.textContent = 'Hazırlanıyor...';

    await unlockAudio();
    const permission = await requestNotificationPermission();
    vibrate([120], true);

    if (permission === 'denied') {
      note.textContent = 'Bildirimler kapalı. Ses ve ekran uyarıları çalışmaya devam edecek.';
      // Kısa gecikme — kullanıcı notu okusun
      setTimeout(() => showStationStep(container, dispatch), 1400);
    } else {
      showStationStep(container, dispatch);
    }
  });
}

function showStationStep(container, dispatch) {
  const stations = DEFAULT_STATIONS;

  container.innerHTML = `
    <section class="first-launch">
      <div class="first-launch-panel">
        <p class="eyebrow">Adım 2 / 2</p>
        <h1>Hangi İstasyondasınız?</h1>
        <p class="first-launch-copy">
          Sistemin izleyeceği istasyonu seçin.
          Seçilen istasyona gelen trenlerde uyarı alırsınız.
          Ayarlar'dan sonra değiştirebilirsiniz.
        </p>

        <div class="station-picker">
          ${stations.map(s => `
            <button class="station-pick-btn" data-id="${s.id}" type="button">
              ${s.label}
            </button>`).join('')}
        </div>

        <div class="first-launch-note" id="station-confirm-area">
          Bir durak seçin.
        </div>
      </div>
    </section>`;

  let selectedId = null;

  container.querySelectorAll('.station-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Seçimi güncelle
      container.querySelectorAll('.station-pick-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedId = btn.dataset.id;

      // Onay alanını güncelle
      const area = container.querySelector('#station-confirm-area');
      area.innerHTML = `
        <strong style="color:var(--watched);display:block;margin-bottom:10px">
          ✓ ${btn.textContent.trim()} seçildi
        </strong>
        <button class="btn btn-primary first-launch-btn" id="confirm-station" type="button">
          Devam Et →
        </button>`;

      area.querySelector('#confirm-station').addEventListener('click', () => {
        confirmStation(selectedId, dispatch);
      });
    });
  });
}

function confirmStation(stationId, dispatch) {
  dispatch('UPDATE_SETTINGS', { watchedStationId: stationId });
  dispatch('COMPLETE_FIRST_LAUNCH');
}
