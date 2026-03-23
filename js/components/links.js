/* =================================================================
   즐겨찾기 링크 컴포넌트
   ================================================================= */

async function loadLinks() {
  const rows = await fetchSheetData(CONFIG.SHEETS.LINKS);
  if (!rows) { renderLinksFallback(); return; }
  const links = rows.slice(1).map((r, i) => ({
    name: r[0] || '', url: r[1] || '#', icon: r[2] || 'fas fa-globe',
    color: LINK_COLORS[i % LINK_COLORS.length],
  })).filter(l => l.name.trim());
  renderLinks(links);
}

function renderLinks(links) {
  const grid = document.getElementById('link-grid');
  if (!links.length) {
    grid.innerHTML = '<a class="link-item" style="color:var(--text-muted)">등록된 링크가 없습니다</a>';
    return;
  }
  grid.innerHTML = links.map(l => `
    <a class="link-item" href="${l.url}" target="_blank" rel="noopener" title="${l.url}">
      <div class="link-icon" style="background:${l.color}"><i class="${l.icon}"></i></div>
      <span class="link-name">${l.name}</span>
    </a>`).join('');
}

function renderLinksFallback() {
  renderLinks([
    { name: '업무포털', url: 'https://cne.eduptl.kr/', icon: 'fas fa-briefcase', color: '#f59e0b' },
    { name: 'Google Drive', url: 'https://drive.google.com', icon: 'fab fa-google-drive', color: '#22c55e' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: 'fab fa-youtube', color: '#ef4444' },
    { name: '아직미정', url: '#', icon: 'fas fa-file-alt', color: '#ec4899' },
  ]);
}
