/* =================================================================
   시간표 컴포넌트
   ================================================================= */

const TT_OVERRIDE_KEY = 'dashboard_timetable_overrides';
let timetableViewDayOverride = null;
let sheetTimetableCache = null;
let timetableLoaded = false;

/* --- 로컬 오버라이드 (임시 추가/삭제) --- */

function loadTTOverrides() {
  try {
    const raw = localStorage.getItem(TT_OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTTOverrides(ov) {
  localStorage.setItem(TT_OVERRIDE_KEY, JSON.stringify(ov));
}

/** key: "요일번호-교시" ex: "1-3" = 월요일 3교시 */
function overrideKey(dayIdx, period) {
  return `${dayIdx}-${period}`;
}

function setTTOverride(dayIdx, period, subject) {
  const ov = loadTTOverrides();
  ov[overrideKey(dayIdx, period)] = subject;
  saveTTOverrides(ov);
}

function removeTTOverride(dayIdx, period) {
  const ov = loadTTOverrides();
  delete ov[overrideKey(dayIdx, period)];
  saveTTOverrides(ov);
}

function getTTOverride(dayIdx, period) {
  const ov = loadTTOverrides();
  const k = overrideKey(dayIdx, period);
  return k in ov ? ov[k] : undefined;
}

/* --- 요일 선택 --- */

function getDefaultTimetableDayIndex() {
  const d = getDayIndex();
  if (d >= 1 && d <= 5) return d;
  return 1;
}

function getTimetableDayIndex() {
  if (timetableViewDayOverride !== null && timetableViewDayOverride >= 1 && timetableViewDayOverride <= 5) {
    return timetableViewDayOverride;
  }
  return getDefaultTimetableDayIndex();
}

function setTimetableViewDay(dayIdx) {
  if (dayIdx < 1 || dayIdx > 5) return;
  timetableViewDayOverride = dayIdx;
}

function syncTimetableDayUI() {
  const d = getTimetableDayIndex();
  document.querySelectorAll('.timetable-day-tab').forEach(btn => {
    const active = parseInt(btn.dataset.day, 10) === d;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function updateTimetableBadge() {
  const badge = document.getElementById('today-day');
  if (!badge) return;
  badge.textContent = DAY_NAMES_KR[getTimetableDayIndex()] + '요일';
}

function initTimetableDayTabs() {
  timetableViewDayOverride = null;
  syncTimetableDayUI();
  updateTimetableBadge();
  document.querySelectorAll('.timetable-day-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day, 10);
      if (day < 1 || day > 5) return;
      setTimetableViewDay(day);
      syncTimetableDayUI();
      updateTimetableBadge();
      renderTimetableForDay();
    });
  });
  initTTContextMenu();
}

/* --- 시트에서 시간표 로드 (하루 한 번) --- */

async function loadTimetable() {
  if (timetableLoaded && sheetTimetableCache) {
    renderTimetableForDay();
    return;
  }

  const rows = await fetchSheetData(CONFIG.SHEETS.TIMETABLE);
  if (!rows || rows.length === 0) { renderTimetableFallback(); return; }

  const headerRowIdx = rows.findIndex(r =>
    r.some(cell => cell && (String(cell).includes('교시') || String(cell).includes('시간')))
  );
  if (headerRowIdx < 0) { renderTimetableFallback(); return; }

  sheetTimetableCache = {};
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const periodLabel = (row[0] || '').trim();
    const timeStr = (row[1] || '').trim();
    if (!periodLabel) continue;
    const periodNum = parseInt(periodLabel, 10) || (i - headerRowIdx);

    if (timeStr && timeStr.includes('~')) {
      const [start, end] = timeStr.split('~').map(s => s.trim());
      CONFIG.PERIOD_TIMES[periodNum - 1] = { start, end };
    }

    for (let d = 1; d <= 5; d++) {
      const colIndex = d + 1;
      const subject = (row[colIndex] || '').trim();
      const key = overrideKey(d, periodNum);
      if (!sheetTimetableCache[d]) sheetTimetableCache[d] = [];
      sheetTimetableCache[d].push({ period: periodNum, subject, timeStr });
    }
  }

  timetableLoaded = true;
  renderTimetableForDay();
}

function renderTimetableForDay() {
  const dayIdx = getTimetableDayIndex();
  const dayData = sheetTimetableCache ? sheetTimetableCache[dayIdx] : null;
  if (!dayData || dayData.length === 0) {
    renderTimetable([]);
    return;
  }

  const periods = dayData.map(p => {
    const ov = getTTOverride(dayIdx, p.period);
    return {
      period: p.period,
      subject: ov !== undefined ? ov : p.subject,
      timeStr: p.timeStr,
      isOverride: ov !== undefined,
    };
  });
  renderTimetable(periods);
}

function renderTimetable(periods) {
  const list = document.getElementById('timetable-list');
  const selectedDay = getTimetableDayIndex();
  list.dataset.viewDay = String(selectedDay);

  if (periods.length === 0) {
    list.innerHTML = '<li class="timetable-item"><span class="subject" style="color:var(--text-muted)">이 날은 수업이 없습니다</span></li>';
    return;
  }

  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = getDayIndex();
  const isTodayView = selectedDay === today && today >= 1 && today <= 5;

  list.innerHTML = periods.map(p => {
    const t = CONFIG.PERIOD_TIMES[p.period - 1];
    let cur = false;
    let ts = '';
    if (t) {
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      cur = isTodayView && nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
      ts = `${t.start}~${t.end}`;
    } else if (p.timeStr) {
      ts = p.timeStr;
    }

    let subjectText = p.subject || '<span style="color:var(--text-muted)">-</span>';
    if (p.isOverride && p.subject) {
      subjectText = `<span style="color:var(--accent)">${p.subject}</span>`;
    }

    return `<li class="timetable-item${cur ? ' current' : ''}" data-period="${p.period}" data-day="${selectedDay}">
      <span class="period">${p.period}</span>
      <span class="subject">${subjectText}</span>
      <span class="time-range">${ts}</span>
    </li>`;
  }).join('');
}

function renderTimetableFallback() {
  document.getElementById('timetable-list').innerHTML =
    '<li class="timetable-item"><span class="subject" style="color:var(--text-muted)">시간표를 불러올 수 없습니다</span></li>';
}

/* --- 우클릭 컨텍스트 메뉴 --- */

function initTTContextMenu() {
  let menu = document.getElementById('tt-context-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'tt-context-menu';
    menu.className = 'tt-context-menu';
    menu.style.display = 'none';
    menu.innerHTML = `
      <button class="tt-ctx-btn" data-action="edit"><i class="fas fa-pen"></i> 수업 변경</button>
      <button class="tt-ctx-btn" data-action="clear"><i class="fas fa-eraser"></i> 비우기</button>
      <button class="tt-ctx-btn" data-action="restore"><i class="fas fa-undo"></i> 원래대로</button>
    `;
    document.body.appendChild(menu);
  }

  let ctxDay = 0, ctxPeriod = 0;

  document.getElementById('timetable-list').addEventListener('dblclick', e => {
    const li = e.target.closest('.timetable-item[data-period]');
    if (!li) return;

    ctxDay = parseInt(li.dataset.day, 10);
    ctxPeriod = parseInt(li.dataset.period, 10);

    const rect = li.getBoundingClientRect();
    menu.style.display = 'block';
    let x = rect.left + rect.width / 2 - menu.offsetWidth / 2;
    let y = rect.bottom + 4;
    if (x < 4) x = 4;
    if (x + menu.offsetWidth > window.innerWidth - 4) x = window.innerWidth - menu.offsetWidth - 4;
    if (y + menu.offsetHeight > window.innerHeight - 4) y = rect.top - menu.offsetHeight - 4;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
  });

  menu.querySelector('[data-action="edit"]').addEventListener('click', () => {
    menu.style.display = 'none';
    const name = prompt('수업 이름을 입력하세요:');
    if (name === null) return;
    if (name.trim()) {
      setTTOverride(ctxDay, ctxPeriod, name.trim());
    }
    renderTimetableForDay();
  });

  menu.querySelector('[data-action="clear"]').addEventListener('click', () => {
    menu.style.display = 'none';
    setTTOverride(ctxDay, ctxPeriod, '');
    renderTimetableForDay();
  });

  menu.querySelector('[data-action="restore"]').addEventListener('click', () => {
    menu.style.display = 'none';
    removeTTOverride(ctxDay, ctxPeriod);
    renderTimetableForDay();
  });

  document.addEventListener('click', e => {
    if (!menu.contains(e.target)) menu.style.display = 'none';
  });
}

/* --- 현재 교시 강조 --- */

function updateCurrentPeriod() {
  const list = document.getElementById('timetable-list');
  if (!list) return;
  const viewDay = parseInt(list.dataset.viewDay || '0', 10);
  const today = getDayIndex();
  const isTodayView = viewDay === today && today >= 1 && today <= 5;

  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  document.querySelectorAll('.timetable-item').forEach((item, idx) => {
    if (!isTodayView) {
      item.classList.remove('current');
      return;
    }
    const t = CONFIG.PERIOD_TIMES[idx];
    if (!t) return;
    const [sh, sm] = t.start.split(':').map(Number);
    const [eh, em] = t.end.split(':').map(Number);
    item.classList.toggle('current', nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em);
  });
}
