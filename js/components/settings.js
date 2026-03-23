/* =================================================================
   설정 컴포넌트 (배경/카드 색상, 폰트, 폰트 색상)
   ================================================================= */

const SETTINGS_STORAGE_KEY = 'dashboard_settings';

const DEFAULT_SETTINGS = {
  bgColor: '#1e293b',
  bgOpacity: 0,
  cardColor: '#ffffff',
  cardOpacity: 72,
  font: "'Noto Sans KR', sans-serif",
  fontColor: '#1a1a1a',
};

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function applySettings(settings) {
  const root = document.documentElement;

  const bg = hexToRgb(settings.bgColor);
  root.style.setProperty('--settings-bg',
    `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${settings.bgOpacity / 100})`);
  document.querySelector('.background-overlay').style.background =
    `rgba(${bg.r}, ${bg.g}, ${bg.b}, ${settings.bgOpacity / 100})`;

  const card = hexToRgb(settings.cardColor);
  root.style.setProperty('--glass-bg',
    `rgba(${card.r}, ${card.g}, ${card.b}, ${settings.cardOpacity / 100})`);

  root.style.setProperty('--font-family', settings.font);
  document.body.style.fontFamily = settings.font;

  root.style.setProperty('--text-primary', settings.fontColor);

  const brightness = (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000;
  const cardBrightness = (card.r * 299 + card.g * 587 + card.b * 114) / 1000;

  if (cardBrightness < 128) {
    root.style.setProperty('--text-secondary', lighten(settings.fontColor, 30));
    root.style.setProperty('--text-muted', lighten(settings.fontColor, 60));
  } else {
    root.style.setProperty('--text-secondary', settings.fontColor);
    root.style.setProperty('--text-muted', '#888888');
  }
}

function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.min(255, r + amount);
  const ng = Math.min(255, g + amount);
  const nb = Math.min(255, b + amount);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function syncUI(settings) {
  document.getElementById('setting-bg-color').value = settings.bgColor;
  document.getElementById('setting-bg-label').textContent = settings.bgColor;
  document.getElementById('setting-bg-opacity').value = settings.bgOpacity;
  document.getElementById('setting-bg-opacity-label').textContent = settings.bgOpacity + '%';

  document.getElementById('setting-card-color').value = settings.cardColor;
  document.getElementById('setting-card-label').textContent = settings.cardColor;
  document.getElementById('setting-card-opacity').value = settings.cardOpacity;
  document.getElementById('setting-card-opacity-label').textContent = settings.cardOpacity + '%';

  document.getElementById('setting-font').value = settings.font;

  document.getElementById('setting-font-color').value = settings.fontColor;
  document.getElementById('setting-font-label').textContent = settings.fontColor;
}

function initSettings() {
  let settings = loadSettings();
  applySettings(settings);
  syncUI(settings);

  function update(key, val) {
    settings[key] = val;
    applySettings(settings);
    saveSettings(settings);
    syncUI(settings);
  }

  document.getElementById('setting-bg-color').addEventListener('input', e => {
    update('bgColor', e.target.value);
  });
  document.getElementById('setting-bg-opacity').addEventListener('input', e => {
    update('bgOpacity', parseInt(e.target.value));
  });

  document.getElementById('setting-card-color').addEventListener('input', e => {
    update('cardColor', e.target.value);
  });
  document.getElementById('setting-card-opacity').addEventListener('input', e => {
    update('cardOpacity', parseInt(e.target.value));
  });

  document.getElementById('setting-font').addEventListener('change', e => {
    update('font', e.target.value);
  });

  document.getElementById('setting-font-color').addEventListener('input', e => {
    update('fontColor', e.target.value);
  });

  document.getElementById('settings-reset').addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    applySettings(settings);
    saveSettings(settings);
    syncUI(settings);
  });

  const panel = document.getElementById('settings-panel');
  const wrapper = document.getElementById('settings-wrapper');
  const btn = document.getElementById('settings-btn');

  btn.addEventListener('click', () => {
    panel.classList.toggle('pinned');
  });

  document.addEventListener('mousedown', e => {
    if (!wrapper.contains(e.target)) panel.classList.remove('pinned');
  });
}
