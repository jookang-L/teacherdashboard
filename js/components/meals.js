/* =================================================================
   급식 컴포넌트 (NEIS 교육정보 API 연동)
   ================================================================= */

const MEAL_STORAGE_KEY = 'dashboard_school_info';

function loadSavedSchool() {
  try {
    const saved = localStorage.getItem(MEAL_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch { return null; }
}

function saveSchool(info) {
  localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(info));
}

function applySchool(info) {
  CONFIG.NEIS.ATPT_OFCDC_SC_CODE = info.eduCode;
  CONFIG.NEIS.SD_SCHUL_CODE = info.schoolCode;
  CONFIG.NEIS.SCHOOL_NAME = info.schoolName;
  const el = document.getElementById('school-current');
  if (el) el.textContent = `🏫 ${info.schoolName}`;
}

async function searchSchool(name) {
  const params = new URLSearchParams({
    KEY: CONFIG.NEIS.API_KEY,
    Type: 'json',
    SCHUL_NM: name,
    pSize: '10',
  });
  const url = `https://open.neis.go.kr/hub/schoolInfo?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`학교 검색 실패: HTTP ${res.status}`);
  const data = await res.json();

  const info = data?.schoolInfo;
  if (!info || !info[1]?.row?.length) return [];

  return info[1].row.map(r => ({
    schoolName: r.SCHUL_NM,
    schoolCode: r.SD_SCHUL_CODE,
    eduCode: r.ATPT_OFCDC_SC_CODE,
    address: r.ORG_RDNMA || '',
  }));
}

function renderSchoolResults(results) {
  const existing = document.getElementById('school-results');
  if (existing) existing.remove();

  if (!results.length) return;

  const ul = document.createElement('ul');
  ul.className = 'school-results';
  ul.id = 'school-results';
  results.forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `${r.schoolName}<span class="school-result-sub">${r.address}</span>`;
    li.addEventListener('click', () => {
      const info = { eduCode: r.eduCode, schoolCode: r.schoolCode, schoolName: r.schoolName };
      saveSchool(info);
      applySchool(info);
      ul.remove();
      document.getElementById('school-name-input').value = '';
      loadLunch();
    });
    ul.appendChild(li);
  });

  const searchEl = document.getElementById('school-search');
  searchEl.parentNode.insertBefore(ul, searchEl.nextSibling);
}

function initSchoolSearch() {
  const saved = loadSavedSchool();
  if (saved) {
    applySchool(saved);
  } else {
    applySchool({
      eduCode: CONFIG.NEIS.ATPT_OFCDC_SC_CODE,
      schoolCode: CONFIG.NEIS.SD_SCHUL_CODE,
      schoolName: CONFIG.NEIS.SCHOOL_NAME,
    });
  }

  const input = document.getElementById('school-name-input');
  const btn = document.getElementById('school-search-btn');

  async function doSearch() {
    const name = input.value.trim();
    if (!name) return;
    btn.disabled = true;
    try {
      const results = await searchSchool(name);
      renderSchoolResults(results);
    } catch (err) {
      console.warn('[학교 검색 실패]', err.message);
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
}

/* =================================================================
   급식 데이터 조회
   ================================================================= */

async function lookupSchoolCode() {
  if (CONFIG.NEIS.SD_SCHUL_CODE) return CONFIG.NEIS.SD_SCHUL_CODE;

  const params = new URLSearchParams({
    KEY: CONFIG.NEIS.API_KEY,
    Type: 'json',
    ATPT_OFCDC_SC_CODE: CONFIG.NEIS.ATPT_OFCDC_SC_CODE,
    SCHUL_NM: CONFIG.NEIS.SCHOOL_NAME,
  });
  const url = `https://open.neis.go.kr/hub/schoolInfo?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`학교 조회 실패: HTTP ${res.status}`);
  const data = await res.json();

  const info = data?.schoolInfo;
  if (!info || !info[1]?.row?.length) throw new Error('학교를 찾을 수 없습니다');

  CONFIG.NEIS.SD_SCHUL_CODE = info[1].row[0].SD_SCHUL_CODE;
  return CONFIG.NEIS.SD_SCHUL_CODE;
}

async function fetchMealData(dateStr) {
  const schoolCode = await lookupSchoolCode();
  const ymd = dateStr.replace(/-/g, '');

  const params = new URLSearchParams({
    KEY: CONFIG.NEIS.API_KEY,
    Type: 'json',
    ATPT_OFCDC_SC_CODE: CONFIG.NEIS.ATPT_OFCDC_SC_CODE,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: ymd,
  });
  const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?${params}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`급식 조회 실패: HTTP ${res.status}`);
  return await res.json();
}

function parseMealMenu(rawMenu) {
  return rawMenu
    .split(/<br\s*\/?>/)
    .map(item => item.replace(/\s*\([\d.,]+\)\s*/g, '').replace(/^\*+/, '').trim())
    .filter(Boolean);
}

async function loadLunch() {
  try {
    const todayStr = dateToStr(getNow());
    const data = await fetchMealData(todayStr);

    const mealInfo = data?.mealServiceDietInfo;
    if (!mealInfo || !mealInfo[1]?.row?.length) {
      renderLunch(['오늘의 급식 정보가 없습니다']);
      return;
    }

    const lunchRow = mealInfo[1].row.find(r => r.MMEAL_SC_NM === '중식') || mealInfo[1].row[0];
    const menuItems = parseMealMenu(lunchRow.DDISH_NM);
    renderLunch(menuItems.length ? menuItems : ['오늘의 급식 정보가 없습니다']);
  } catch (err) {
    console.warn('[급식 로딩 실패]', err.message);
    renderLunch(['급식 정보를 불러올 수 없습니다']);
  }
}

function renderLunch(items) {
  document.getElementById('lunch-list').innerHTML =
    items.map(i => `<li class="lunch-item">${i}</li>`).join('');
}
