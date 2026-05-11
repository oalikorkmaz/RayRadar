export function renderBanners(container, state, dispatch) {
  const banners = state.ui.banners || [];
  container.innerHTML = banners.map(banner => {
    const kind = banner.type === 'warning' ? 'warn' : banner.type === 'arrival' ? 'crit persist' : 'crit';
    return `
      <div class="alert-banner ${kind}" role="alert" data-banner-id="${banner.id}">
        <div class="alert-icon">${iconFor(banner.type)}</div>
        <div class="alert-copy">
          <span>${titleFor(banner.type)}</span>
          <strong>${escapeHtml(banner.message)}</strong>
        </div>
        <button class="alert-close" data-id="${banner.id}" title="Kapat" aria-label="Kapat">×</button>
      </div>`;
  }).join('');

  container.querySelectorAll('.alert-close').forEach(button => {
    button.addEventListener('click', () => {
      dispatch('REMOVE_BANNER', { id: Number(button.dataset.id) });
    });
  });
}

function iconFor(type) {
  if (type === 'arrival') return '✓';
  return '!';
}

function titleFor(type) {
  if (type === 'warning') return 'Ön uyarı';
  if (type === 'arrival') return 'Varış';
  return 'Çakışma riski';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
