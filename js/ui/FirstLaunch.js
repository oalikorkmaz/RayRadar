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
          Bu sistemin izleyeceği istasyonu seçin. Seçtiğiniz istasyona gelen trenlerde
          uyarı alırsınız. Ayarlar'dan sonra değiştirebilirsiniz.
        </p>

        <div class="station-picker">
          ${stations.map(s => `
            <button class="station-pick-btn" data-id="${s.id}">
              ${s.label}
            </button>`).join('')}
        </div>

        <p class="first-launch-note">Lütfen bir durak seçin.</p>
      </div>
    </section>`;

  // Seçilen durak için stil
  container.querySelectorAll('.station-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.station-pick-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Durak seçildiğinde ilerle
  container.querySelectorAll('.station-pick-btn').forEach(btn => {
    btn.addEventListener('dblclick', () => confirmStation(btn.dataset.id, dispatch));
  });

  // Tek tıkla seç + onayla butonu
  const note = container.querySelector('.first-launch-note');
  container.addEventListener('click', e => {
    const pick = e.target.closest('.station-pick-btn');
    if (!pick) return;
    note.innerHTML = `
      <strong style="color:var(--watched)">${pick.textContent.trim()}</strong> seçildi.
      <button class="btn btn-primary" id="confirm-station" style="margin-top:14px;width:100%">
        Devam Et →
      </button>`;
    container.querySelector('#confirm-station')?.addEventListener('click', () => {
      confirmStation(pick.dataset.id, dispatch);
    });
  });
}

function confirmStation(stationId, dispatch) {
  dispatch('UPDATE_SETTINGS', { watchedStationId: stationId });
  dispatch('COMPLETE_FIRST_LAUNCH');
}
