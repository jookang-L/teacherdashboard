/* =================================================================
   TODO + 메모 컴포넌트
   ================================================================= */

let todos = [];

async function loadTodos() {
  const rows = await fetchSheetData(CONFIG.SHEETS.TODO);
  if (!rows) { loadTodosLocal(); return; }
  todos = rows.slice(1).map((r, i) => ({
    id: i, text: r[0] || '', done: (r[1] || '').toUpperCase() === 'TRUE',
  })).filter(t => t.text.trim());
  renderTodos();
  saveTodosLocal();
}

function loadTodosLocal() {
  try {
    const s = localStorage.getItem('dashboard_todos');
    todos = s ? JSON.parse(s) : [
      { id: 0, text: '수업 자료 준비', done: false },
      { id: 1, text: '학부모 상담 일지 작성', done: true },
      { id: 2, text: '생활기록부 입력', done: false },
    ];
  } catch { todos = []; }
  renderTodos();
}

function saveTodosLocal() {
  localStorage.setItem('dashboard_todos', JSON.stringify(todos));
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if (!todos.length) {
    list.innerHTML = '<li class="todo-item" style="color:var(--text-muted);justify-content:center;">할 일이 없습니다</li>';
    return;
  }
  list.innerHTML = todos.map(t => `
    <li class="todo-item" data-id="${t.id}">
      <div class="todo-checkbox${t.done ? ' checked' : ''}" onclick="toggleTodo(${t.id})"></div>
      <span class="todo-text${t.done ? ' completed' : ''}">${t.text}</span>
      <button class="todo-delete" onclick="deleteTodo(${t.id})" title="삭제"><i class="fas fa-times"></i></button>
    </li>`).join('');
}

function toggleTodo(id) {
  const t = todos.find(x => x.id === id);
  if (t) t.done = !t.done;
  renderTodos(); saveTodosLocal();
}

function deleteTodo(id) {
  todos = todos.filter(x => x.id !== id);
  renderTodos(); saveTodosLocal();
  if (typeof updateDayMarkersOnStrip === 'function') updateDayMarkersOnStrip();
}

function addTodo(text) {
  if (!text.trim()) return;
  const maxId = todos.reduce((m, t) => Math.max(m, t.id), -1);
  todos.push({ id: maxId + 1, text: text.trim(), done: false });
  renderTodos(); saveTodosLocal();
  if (typeof updateDayMarkersOnStrip === 'function') updateDayMarkersOnStrip();
}

function initTodoInput() {
  document.getElementById('btn-add-todo').addEventListener('click', () => {
    const list = document.getElementById('todo-list');
    if (document.querySelector('.todo-input-wrapper')) return;
    const w = document.createElement('div');
    w.className = 'todo-input-wrapper';
    w.innerHTML = '<input type="text" placeholder="할 일을 입력하세요..." autofocus><button>추가</button>';
    list.parentElement.insertBefore(w, list);
    const inp = w.querySelector('input'), btn = w.querySelector('button');
    function submit() { addTodo(inp.value); w.remove(); }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') w.remove();
    });
    inp.focus();
  });
}

/* =================================================================
   메모
   ================================================================= */

async function loadMemo() {
  const rows = await fetchSheetData(CONFIG.SHEETS.MEMO);
  if (rows && rows.length > 0) {
    document.getElementById('memo-textarea').value = rows.map(r => r.join('\t')).join('\n');
    saveMemoLocal();
  } else { loadMemoLocal(); }
}

function loadMemoLocal() {
  const s = localStorage.getItem('dashboard_memo');
  if (s) document.getElementById('memo-textarea').value = s;
}

function saveMemoLocal() {
  localStorage.setItem('dashboard_memo', document.getElementById('memo-textarea').value);
}

function initMemo() {
  let t;
  document.getElementById('memo-textarea').addEventListener('input', () => {
    clearTimeout(t); t = setTimeout(saveMemoLocal, 500);
  });
}
