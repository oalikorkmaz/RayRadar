export function renderNotifications(container, state, dispatch) {
  const banners  = state.ui.banners || [];
  const history  = (state.history || []).slice(0, 20);
  const arrivals = history.filter(t => t.status === 'arrived' || t.status === 'manual_arrived');

  container.innerHTML = `
    <div class="modal-overlay" id="notif-overlay">
      <div class="modal-card notif-card">

        <div class="modal-header">
          <div>
            <p class="panel-kicker">Bildirimler</p>
            <h2>Uyarılar &amp; Geçmiş</h2>
          </div>
          <button class="modal-x" id="notif-close" aria-label="Kapat">×</button>
        </div>

        <!-- Aktif uyarılar -->
        <section class="notif-section">
          <p class="settings-label">Aktif Uyarılar</p>
          ${banners.length === 0
            ? `<p class="notif-empty">Aktif uyarı yok</p>`
            : banners.map(b => `
              <div class="notif-row notif-${b.type === 'warning' ? 'warn' : 'crit'}">
                <span class="notif-icon">${b.type === 'arrival' ? '✓' : '!'}</span>
                <div class="notif-body">
                  <span class="notif-label">${labelFor(b.type)}</span>
                  <strong class="notif-msg">${escapeHtml(b.message)}</strong>
                </div>
                <button class="notif-dismiss btn btn-sm btn-ghost"
                        data-id="${b.id}" aria-label="Kapat">×</button>
              </div>`).join('')}
        </section>

        <!-- Son varışlar -->
        <section class="notif-section" style="margin-top:18px">
          <p class="settings-label">Son Varışlar</p>
          ${arrivals.length === 0
            ? `<p class="notif-empty">Henüz kayıtlı varış yok</p>`
            : arrivals.map(t => {
                const ts = t.arrivedAt || t.endedAt;
                const timeStr = ts
                  ? new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                  : '—';
                const manual = t.status === 'manual_arrived';
                return `
                  <div class="notif-row notif-history">
                    <span class="notif-icon notif-ok">✓</span>
                    <div class="notif-body">
                      <span class="notif-label">${timeStr}${manual ? ' · Manuel' : ''}</span>
                      <strong class="notif-msg">Tren ${escapeHtml(t.trainNumber)}</strong>
                    </div>
                  </div>`;
              }).join('')}
        </section>

      </div>
    </div>`;

  document.getElementById('notif-close').onclick = () => dispatch('CLOSE_NOTIFICATIONS');
  document.getElementById('notif-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) dispatch('CLOSE_NOTIFICATIONS');
  });
  container.querySelectorAll('.notif-dismiss').forEach(btn => {
    btn.addEventListener('click', () => {
      dispatch('REMOVE_BANNER', { id: Number(btn.dataset.id) });
    });
  });
}

function labelFor(type) {
  if (type === 'warning')  return 'Ön uyarı';
  if (type === 'arrival')  return 'Varış';
  return 'Çakışma riski';
}

function escapeHtml(v) {
  return String(v)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
