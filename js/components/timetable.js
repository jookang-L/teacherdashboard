/* =================================================================
   시간표 컴포넌트
   ================================================================= */

async function loadTimetable() {
  const dayIdx = getDayIndex(); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  if (dayIdx === 0 || dayIdx === 6) { renderTimetable([]); return; }

  const rows = await fetchSheetData(CONFIG.SHEETS.TIMETABLE);
  if (!rows || rows.length === 0) { renderTimetableFallback(); return; }

  const headerRowIdx = rows.findIndex(r =>
    r.some(cell => cell && (cell.includes('교시') || cell.includes('시간')))
  );

  if (headerRowIdx < 0) { renderTimetableFallback(); return; }

  // 시트 컬럼: A(0)=교시, B(1)=시간, C(2)=월, D(3)=화, E(4)=수, F(5)=목, G(6)=금
  // dayIdx: 1=월→col2, 2=화→col3, 3=수→col4, 4=목→col5, 5=금→col6
  const colIndex = dayIdx + 1;

  const periods = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const periodLabel = (row[0] || '').trim();
    const timeStr = (row[1] || '').trim();
    const subject = (row[colIndex] || '').trim();

    if (!periodLabel) continue;

    const periodNum = parseInt(periodLabel) || (i - headerRowIdx);

    // 시트의 시간 정보로 PERIOD_TIMES 갱신
    if (timeStr && timeStr.includes('~')) {
      const [start, end] = timeStr.split('~').map(s => s.trim());
      if (CONFIG.PERIOD_TIMES[periodNum - 1]) {
        CONFIG.PERIOD_TIMES[periodNum - 1] = { start, end };
      } else {
        CONFIG.PERIOD_TIMES[periodNum - 1] = { start, end };
      }
    }

    periods.push({
      period: periodNum,
      subject: subject || '',
      timeStr: timeStr
    });
  }

  renderTimetable(periods);
}

function renderTimetable(periods) {
  const list = document.getElementById('timetable-list');
  if (periods.length === 0) {
    list.innerHTML = '<li class="timetable-item"><span class="subject" style="color:var(--text-muted)">오늘은 수업이 없습니다</span></li>';
    return;
  }

  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  list.innerHTML = periods.map(p => {
    const t = CONFIG.PERIOD_TIMES[p.period - 1];
    let cur = false, ts = '';
    if (t) {
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      cur = nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em;
      ts = `${t.start}~${t.end}`;
    } else if (p.timeStr) {
      ts = p.timeStr;
    }

    const subjectText = p.subject || '<span style="color:var(--text-muted)">-</span>';

    return `<li class="timetable-item${cur ? ' current' : ''}">
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

function updateCurrentPeriod() {
  const now = getNow();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  document.querySelectorAll('.timetable-item').forEach((item, idx) => {
    const t = CONFIG.PERIOD_TIMES[idx];
    if (!t) return;
    const [sh, sm] = t.start.split(':').map(Number);
    const [eh, em] = t.end.split(':').map(Number);
    item.classList.toggle('current', nowMin >= sh * 60 + sm && nowMin <= eh * 60 + em);
  });
}
