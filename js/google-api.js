/* =================================================================
   설정 및 Google Sheets API
   =================================================================
   ▼ 아래 GOOGLE_API_KEY 값을 본인의 API 키로 수정하세요
   ================================================================= */

const CONFIG = {
  GOOGLE_API_KEY: 'AIzaSyD4jUD7_3kx1AP2JrzUGJlSiIdHNY9OjUc',

  SPREADSHEET_ID: '1416MR-DO51qbqebk3xklr3_BPX1cDaiRm-6A-foy4bs',

  SHEETS: {
    TIMETABLE: '시트1',
    TODO: '할일',
    MEMO: '메모',
    FOLDERS: '폴더',
    LINKS: '링크',
  },

  // NEIS 교육정보 API (급식 조회용)
  NEIS: {
    API_KEY: '62d00e211727449180139e7020936f2e',
    ATPT_OFCDC_SC_CODE: 'N10',       // 충청남도교육청
    SCHOOL_NAME: '설화고등학교',
    SD_SCHUL_CODE: null,              // 자동 조회됨
  },

  REFRESH_INTERVAL: 5 * 60 * 1000,

  PERIOD_TIMES: [
    { start: '08:40', end: '09:30' },
    { start: '09:40', end: '10:30' },
    { start: '10:40', end: '11:30' },
    { start: '11:40', end: '12:30' },
    { start: '13:40', end: '14:30' },
    { start: '14:40', end: '15:30' },
    { start: '15:40', end: '16:30' },
  ],
};

/* =================================================================
   공용 유틸리티
   ================================================================= */

const DAY_NAMES_KR = ['일', '월', '화', '수', '목', '금', '토'];
const LINK_COLORS = [
  '#4a7cff', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316',
];

function pad(n) { return n.toString().padStart(2, '0'); }
function getNow() { return new Date(); }
function getDayIndex() { return getNow().getDay(); }

function dateToStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(a, b) {
  const msDay = 86400000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / msDay);
}

/* =================================================================
   Google Sheets API Fetch
   ================================================================= */

async function fetchSheetData(sheetName, range) {
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(fullRange)}?key=${CONFIG.GOOGLE_API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.values || [];
  } catch (err) {
    console.warn(`[시트 로딩 실패] ${sheetName}:`, err.message);
    return null;
  }
}
