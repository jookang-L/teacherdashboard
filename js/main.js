/* =================================================================
   메인 초기화 - 시계, 달력 스트립, D-Day, 드래그 앤 드롭
   ================================================================= */

/* =================================================================
   시계
   ================================================================= */

function updateClock() {
  const now = getNow();
  document.getElementById('clock-time').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
  document.getElementById('clock-date').textContent =
    `${y}년 ${m}월 ${d}일 ${DAY_NAMES_KR[now.getDay()]}요일`;
}


/* =================================================================
   D-Day 관리
   ================================================================= */

let ddays = [];

function loadDDays() {
  try {
    const s = localStorage.getItem('dashboard_ddays');
    ddays = s ? JSON.parse(s) : [];
  } catch { ddays = []; }
}

function saveDDays() {
  localStorage.setItem('dashboard_ddays', JSON.stringify(ddays));
}

function addDDay(name, dateStr) {
  ddays.push({ id: Date.now(), name, date: dateStr });
  saveDDays();
  renderCalendarStrip();
  renderDDayCards();
}

function removeDDay(id) {
  ddays = ddays.filter(d => d.id !== id);
  saveDDays();
  renderCalendarStrip();
  renderDDayCards();
}

function getDDaysForDate(dateStr) {
  return ddays.filter(d => d.date === dateStr);
}

/** 달력에서 추가한 '해당 일' 할 일 — `[MM-DD] 내용` 형식 (openMemoModal) */
function hasCalendarTodoForDate(dateStr) {
  const tag = `[${dateStr.slice(5)}]`;
  try {
    const raw = localStorage.getItem('dashboard_todos');
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return false;
    return list.some(t => {
      const text = (t.text || '').trim();
      return text.startsWith(tag);
    });
  } catch { return false; }
}

function dayHasCalendarMarker(dateStr) {
  return getDDaysForDate(dateStr).length > 0 || hasCalendarTodoForDate(dateStr);
}

/** 스트립 DOM만 갱신 (스크롤 유지, TODO 로드 후 마커 반영) */
function updateDayMarkersOnStrip() {
  document.querySelectorAll('.cal-strip-day[data-date]').forEach(el => {
    const ds = el.dataset.date;
    el.classList.toggle('has-marker', dayHasCalendarMarker(ds));
  });
}

/* =================================================================
   D-Day 카드뉴스 (달력 오른쪽)
   ================================================================= */

function renderDDayCards() {
  const area = document.getElementById('dday-cards-area');
  const today = getNow();

  const sorted = [...ddays].sort((a, b) => {
    const da = Math.abs(daysBetween(today, new Date(a.date + 'T00:00:00')));
    const db = Math.abs(daysBetween(today, new Date(b.date + 'T00:00:00')));
    return da - db;
  });

  if (sorted.length === 0) {
    area.innerHTML = '';
    return;
  }

  area.innerHTML = sorted.map(d => {
    const target = new Date(d.date + 'T00:00:00');
    const diff = daysBetween(today, target);
    let countText;
    if (diff === 0) countText = 'D-Day';
    else if (diff > 0) countText = `D-${diff}`;
    else countText = `D+${Math.abs(diff)}`;

    return `<div class="dday-card" data-dday-id="${d.id}">
      <div class="dday-card-info">
        <div class="dday-card-name">${d.name}</div>
        <div class="dday-card-count">${countText}</div>
        <div class="dday-card-date">${d.date}</div>
      </div>
      <button class="dday-card-delete" onclick="removeDDay(${d.id})" title="삭제">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  }).join('');
}

/* =================================================================
   날짜 호버 툴팁 (D-Day / 메모 추가)
   ================================================================= */

let tooltipDate = null;
let tooltipHideTimer = null;

function showDayTooltip(dateStr, anchorEl) {
  tooltipDate = dateStr;
  const tooltip = document.getElementById('day-tooltip');
  tooltip.style.display = 'flex';

  const rect = anchorEl.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
  let top = rect.bottom + 6;
  if (left < 4) left = 4;
  if (left + tooltip.offsetWidth > window.innerWidth - 4) left = window.innerWidth - tooltip.offsetWidth - 4;
  if (top + tooltip.offsetHeight > window.innerHeight - 4) top = rect.top - tooltip.offsetHeight - 6;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function hideDayTooltip() {
  document.getElementById('day-tooltip').style.display = 'none';
  tooltipDate = null;
}

function scheduleHideTooltip() {
  clearTimeout(tooltipHideTimer);
  tooltipHideTimer = setTimeout(hideDayTooltip, 250);
}

function cancelHideTooltip() {
  clearTimeout(tooltipHideTimer);
}

function initDayTooltip() {
  const tooltip = document.getElementById('day-tooltip');

  tooltip.addEventListener('mouseenter', cancelHideTooltip);
  tooltip.addEventListener('mouseleave', scheduleHideTooltip);

  document.getElementById('day-tooltip-dday').addEventListener('click', () => {
    if (!tooltipDate) return;
    const d = tooltipDate;
    hideDayTooltip();
    openDDayModal(d);
  });

  document.getElementById('day-tooltip-memo').addEventListener('click', () => {
    if (!tooltipDate) return;
    const d = tooltipDate;
    hideDayTooltip();
    openMemoModal(d);
  });
}

/* =================================================================
   D-Day / 메모 추가 모달 (공용)
   ================================================================= */

let modalMode = 'dday'; // 'dday' | 'memo'

function openDDayModal(dateStr) {
  modalMode = 'dday';
  const overlay = document.getElementById('dday-modal-overlay');
  document.getElementById('dday-modal-title').textContent = 'D-Day 추가';
  document.getElementById('dday-label-name').textContent = '이벤트 이름';
  const nameInput = document.getElementById('dday-input-name');
  nameInput.value = '';
  nameInput.placeholder = '예: 기말고사';
  document.getElementById('dday-input-date').value = dateStr || dateToStr(getNow());
  overlay.style.display = 'flex';
  nameInput.focus();
}

function openMemoModal(dateStr) {
  modalMode = 'memo';
  const overlay = document.getElementById('dday-modal-overlay');
  document.getElementById('dday-modal-title').textContent = '할 일 추가';
  document.getElementById('dday-label-name').textContent = '할 일 내용';
  const nameInput = document.getElementById('dday-input-name');
  nameInput.value = '';
  nameInput.placeholder = '예: 수업 자료 준비';
  document.getElementById('dday-input-date').value = dateStr || dateToStr(getNow());
  overlay.style.display = 'flex';
  nameInput.focus();
}

function initModal() {
  const overlay = document.getElementById('dday-modal-overlay');
  const nameInput = document.getElementById('dday-input-name');

  document.getElementById('dday-modal-close').addEventListener('click', () => overlay.style.display = 'none');
  document.getElementById('dday-modal-cancel').addEventListener('click', () => overlay.style.display = 'none');

  document.getElementById('dday-modal-submit').addEventListener('click', () => {
    const name = nameInput.value.trim();
    const date = document.getElementById('dday-input-date').value;
    if (!name || !date) return;

    if (modalMode === 'dday') {
      addDDay(name, date);
    } else {
      const prefix = `[${date.slice(5)}]`;
      addTodo(`${prefix} ${name}`);
    }
    overlay.style.display = 'none';
  });

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('dday-modal-submit').click();
    if (e.key === 'Escape') overlay.style.display = 'none';
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
}

/* =================================================================
   가로형 달력 스트립
   ================================================================= */

let stripOffset = 0;
const STRIP_RANGE = 60;

function buildStripDays() {
  const today = getNow();
  const days = [];
  for (let i = -STRIP_RANGE; i <= STRIP_RANGE; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function renderCalendarStrip() {
  const track = document.getElementById('cal-strip-track');
  const days = buildStripDays();
  const todayStr = dateToStr(getNow());

  let html = '';
  let lastMonth = -1;

  days.forEach(d => {
    const m = d.getMonth();
    if (m !== lastMonth) {
      html += `<div class="cal-strip-month">${m + 1}월</div>`;
      lastMonth = m;
    }

    const ds = dateToStr(d);
    const dow = d.getDay();
    const isToday = ds === todayStr;
    const hasMarker = dayHasCalendarMarker(ds);

    let cls = 'cal-strip-day';
    if (isToday) cls += ' today';
    if (dow === 0) cls += ' sun';
    if (dow === 6) cls += ' sat';
    if (hasMarker) cls += ' has-marker';

    html += `<div class="${cls}" data-date="${ds}">
      <span class="day-num">${d.getDate()}</span>
      <span class="day-name">${DAY_NAMES_KR[dow]}</span>
    </div>`;
  });

  track.innerHTML = html;
  scrollToToday(false);
  bindStripDayEvents();
}

function bindStripDayEvents() {
  document.getElementById('cal-strip-track').querySelectorAll('.cal-strip-day').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cancelHideTooltip();
      showDayTooltip(el.dataset.date, el);
    });
    el.addEventListener('mouseleave', scheduleHideTooltip);
  });
}

function scrollToToday(smooth) {
  const track = document.getElementById('cal-strip-track');
  const scroll = document.getElementById('cal-strip-scroll');
  const todayEl = track.querySelector('.cal-strip-day.today');
  if (!todayEl) return;

  const scrollW = scroll.offsetWidth;
  const todayLeft = todayEl.offsetLeft;
  const todayW = todayEl.offsetWidth;
  stripOffset = -(todayLeft - scrollW / 2 + todayW / 2);

  track.style.transition = smooth
    ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'none';
  track.style.transform = `translateX(${stripOffset}px)`;
}

function initCalendarStrip() {
  renderCalendarStrip();
  renderDDayCards();

  const track = document.getElementById('cal-strip-track');
  const step = 300;

  document.getElementById('cal-strip-prev').addEventListener('click', () => {
    stripOffset += step;
    track.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translateX(${stripOffset}px)`;
  });

  document.getElementById('cal-strip-next').addEventListener('click', () => {
    stripOffset -= step;
    track.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    track.style.transform = `translateX(${stripOffset}px)`;
  });

  document.getElementById('cal-strip-scroll').addEventListener('wheel', (e) => {
    e.preventDefault();
    stripOffset -= e.deltaY > 0 ? 120 : -120;
    track.style.transition = 'transform 0.15s ease';
    track.style.transform = `translateX(${stripOffset}px)`;
  }, { passive: false });
}

/* =================================================================
   드래그 앤 드롭 (컬럼 간 자유 이동)
   ================================================================= */

function initDragAndDrop() {
  let draggedCard = null;
  let placeholder = null;
  const allColumns = document.querySelectorAll('.column[data-column]');

  function getDropTarget(y, column) {
    const cards = [...column.querySelectorAll('.card:not(.dragging):not(.card-transparent)')];
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      if (y < rect.top + rect.height / 2) return card;
    }
    return null;
  }

  function removePlaceholder() {
    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
    placeholder = null;
  }

  document.querySelectorAll('.card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.cardId);
      placeholder = document.createElement('div');
      placeholder.className = 'drop-placeholder';
      placeholder.style.height = card.offsetHeight + 'px';
    });

    card.addEventListener('dragend', () => {
      if (draggedCard) draggedCard.classList.remove('dragging');
      removePlaceholder();
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedCard = null;
    });
  });

  allColumns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedCard) return;

      removePlaceholder();
      placeholder = document.createElement('div');
      placeholder.className = 'drop-placeholder';
      placeholder.style.height = draggedCard.offsetHeight + 'px';

      const target = getDropTarget(e.clientY, col);
      if (target) {
        col.insertBefore(placeholder, target);
      } else {
        const dockZone = col.querySelector('.dock-zone');
        const seeThrough = col.querySelector('.card-see-through');
        if (dockZone) col.insertBefore(placeholder, dockZone);
        else if (seeThrough) col.insertBefore(placeholder, seeThrough);
        else col.appendChild(placeholder);
      }
    });

    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) removePlaceholder();
    });

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedCard) return;
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.insertBefore(draggedCard, placeholder);
      } else {
        col.appendChild(draggedCard);
      }
      removePlaceholder();
      draggedCard.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedCard = null;
    });
  });

  const centerCards = document.querySelector('.center-cards');
  if (centerCards) {
    centerCards.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    centerCards.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggedCard) return;
      removePlaceholder();
      centerCards.appendChild(draggedCard);
      draggedCard.classList.remove('dragging');
      draggedCard = null;
    });
  }
}

/* =================================================================
   전체 데이터 로드
   ================================================================= */

async function loadAllData() {
  await Promise.all([
    loadTimetable(), loadLunch(), loadTodos(),
    loadMemo(), loadLinks(),
  ]);
  updateDayMarkersOnStrip();
}

/* =================================================================
   DOMContentLoaded
   ================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  initTimetableDayTabs();

  loadDDays();
  initCalendarStrip();
  initDayTooltip();
  initModal();

  initTodoInput();
  initMemo();
  initSchoolSearch();
  initSettings();
  initDragAndDrop();
  loadAllData();

  setInterval(updateCurrentPeriod, 60000);
  setInterval(loadAllData, CONFIG.REFRESH_INTERVAL);
});

/* =================================================================
   Lively Wallpaper 속성 리스너
   ================================================================= */

function livelyPropertyListener(name, val) {
  switch (name) {
    case 'apiKey':
      CONFIG.GOOGLE_API_KEY = val; loadAllData(); break;
    case 'spreadsheetId':
      CONFIG.SPREADSHEET_ID = val; loadAllData(); break;
    case 'refreshInterval':
      CONFIG.REFRESH_INTERVAL = parseInt(val) * 60 * 1000; break;
  }
}
