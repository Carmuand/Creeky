// Creeky - App shell: router hash, sidebar, auth, toasts
import { db, uid, registerTags, findConflict, occursOn, todayISO, addDaysISO, weekEndISO, rolloverHabits, calcStreak, mondayOfWeekKey, isoWeekKey, Q_PRIO, PRIO_META, REMIND_OPTIONS, EMOJI_GRID, APP_VERSION } from './store.js?v=31';
import { Auth } from './auth.js?v=31';
import * as P from './pages.js?v=31';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
let currentFilter = 'inbox';
let currentSub = 'open';
let searchQuery = '';
// Filtros de visualización por sección
let taskView = { prio: 'all', tag: 'all', sort: 'manual', layout: 'list', listSort: false, hideEmpty: false, tagSort: false };
let calView = { offset: 0, list: 'all', onlyTime: false, mode: 'month' };
let matrixView = { list: 'all' };
let countView = 'upcoming';
let searchFilters = { list: 'all', prio: 'all', state: 'all' };
let notifView = 'all';
let profileRange = 'all';
// Detalles de tarea abiertos (para no cerrarlos en cada re-render)
const openDetails = new Set();
const PRIO_ORDER = ['none', 'low', 'medium', 'high'];

// Helper global: calcular bloques Pomodoro (25/5/15) según duración total
function calcPomodoroBlocks(durationMin) {
  const blocks = [];
  let remaining = durationMin;
  let focusCount = 0;
  while (remaining > 0) {
    if (remaining >= 25) {
      blocks.push({ type: 'focus', duration: 25 });
      remaining -= 25;
      focusCount++;
      if (focusCount % 4 === 0) {
        if (remaining >= 15) { blocks.push({ type: 'longBreak', duration: 15 }); remaining -= 15; } else break;
      } else {
        if (remaining >= 5) { blocks.push({ type: 'shortBreak', duration: 5 }); remaining -= 5; } else break;
      }
    } else {
      blocks.push({ type: 'focus', duration: remaining });
      remaining = 0;
    }
  }
  return blocks;
}

function toast(msg, type='info') {
  const c = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-message">${msg}</span><button class="toast-close">✕</button>`;
  el.querySelector('button').onclick = () => el.remove();
  c.appendChild(el);
  setTimeout(()=>el.remove(), 3200);
}

function pushNotification(s, title, text, kind = 'system') {
  s.notifications.unshift({ id: uid('n'), title, text, time: new Date().toLocaleString(), unread: true, kind });
}

function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  // Solo se muestra si hay novedad (> 0); en 0 se oculta del todo
  el.style.display = n > 0 ? 'inline-block' : 'none';
}

function refreshBadges() {
  try {
    const s = db.load();
    const arr = (a) => Array.isArray(a) ? a : [];
    const alive = arr(s.tasks).filter(t => t && !t.deleted);
    const today = todayISO();
    setBadge('tasks-badge', alive.filter(t => !t.done).length);
    setBadge('notif-badge', arr(s.notifications).filter(n => n && n.unread).length);
    setBadge('badge-calendar', alive.filter(t => !t.done && occursOn(t, today)).length);
    // Pomodoro badge: sesiones hoy + tareas con reserva Pomodoro pendientes (visibles incluso sin historial)
    const pomoReserved = alive.filter(t => !t.done && Array.isArray(t.pomodoroBlocks) && t.pomodoroBlocks.length>0).length;
    const pomoTodayLog = arr(s.pomoLog).filter(p => p && p.date === today && p.mode === 'focus').length;
    setBadge('badge-pomodoro', pomoTodayLog + (pomoReserved>0 ? pomoReserved : 0));
    setBadge('badge-eisenhower', alive.filter(t => !t.done).length + ['q1', 'q2', 'q3', 'q4'].reduce((a, q) => a + ((s.matrix || {})[q] || []).length, 0));
    setBadge('badge-habits', arr(s.habits).length);
    // Countdown badge: manuales + tareas con fecha futura (auto countdowns) — es lo que el usuario ve en la sección
    const manualPending = arr(s.countdowns).filter(c => c && c.date >= today).length;
    const autoPending = alive.filter(t => !t.done && t.due && t.due >= today).length;
    setBadge('badge-countdown', manualPending + autoPending);
    const u = Auth.currentUser();
    const av = $('#user-avatar-initial');
    if (u && av) av.textContent = (u.name || 'U')[0].toUpperCase();
  } catch (e) {
    console.warn('Creeky refreshBadges:', e);
  }
}

/* ---- Auth modal ---- */
let authMode = 'signin';
function openAuth(mode='signin') {
  authMode = mode;
  $('#auth-modal').classList.remove('hidden');
  drawAuth();
}
function drawAuth(err='') {
  $('#auth-content').innerHTML = Auth.renderTabs(authMode, err);
  $$('#auth-content [data-auth-tab]').forEach(b => b.onclick = () => { authMode = b.dataset.authTab; drawAuth(); });
  const si = $('#signin-form'), su = $('#signup-form');
  if (si) si.onsubmit = e => {
    e.preventDefault();
    try { Auth.signIn($('#si-email').value.trim(), $('#si-pass').value); enterApp(); toast('Sesión iniciada.', 'success'); }
    catch (er) { drawAuth(er.message); }
  };
  if (su) su.onsubmit = e => {
    e.preventDefault();
    try { Auth.signUp($('#su-name').value.trim(), $('#su-email').value.trim(), $('#su-pass').value); enterApp(); toast('Cuenta creada en local. Bienvenido a Creeky.', 'success'); }
    catch (er) { drawAuth(er.message); }
  };
}

function enterApp() {
  $('#auth-modal').classList.add('hidden');
  $('#main-app').classList.remove('hidden');
  const v = $('#app-version');
  if (v) v.textContent = 'v' + APP_VERSION;
  if (!location.hash) location.hash = '#tasks';
  route();
  refreshBadges();
  logDiagnostics();
}

// Diagnóstico visible en consola (F12): versión real en ejecución + conteos
function logDiagnostics() {
  try {
    const s = db.load();
    const alive = s.tasks.filter(t => !t.deleted);
    console.log(
      `%cCreeky v${APP_VERSION}%c tareas vivas:${alive.length} (pendientes:${alive.filter(t => !t.done).length}) • listas:${s.lists.length} • hoy:${alive.filter(t => !t.done && occursOn(t, todayISO())).length} • notif sin leer:${s.notifications.filter(n => n.unread).length}/${s.notifications.length}`,
      'font-weight:bold', ''
    );
  } catch (e) { console.warn('Creeky diagnostics:', e); }
}

/* ---- Router ---- */
function route() {
  const page = (location.hash || '#tasks').slice(1);
  const s = db.load();
  // Rollover semanal de hábitos antes de pintar (archiva y recalcula rachas)
  try { if (rolloverHabits(s)) db.save(s); } catch (e) { console.warn('Creeky rollover:', e); }
  const user = Auth.currentUser();
  const box = $('#page-container');
  $$('.nav-link[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  $('#page-title').textContent = P.TITLES[page] || page;

  if (page === 'tasks') box.innerHTML = P.TasksPage(s, currentFilter, currentSub, taskView);
  else if (page === 'calendar') box.innerHTML = P.CalendarPage(s, calView);
  else if (page === 'pomodoro') { box.innerHTML = P.PomodoroPage(s); P.mountPomodoro(box); }
  else if (page === 'eisenhower') box.innerHTML = P.EisenhowerPage(s, matrixView);
  else if (page === 'habits') box.innerHTML = P.HabitsPage(s);
  else if (page === 'countdown') box.innerHTML = P.CountdownPage(s, countView);
  else if (page === 'search') box.innerHTML = P.SearchPage(s, searchQuery, searchFilters);
  else if (page === 'sync') box.innerHTML = P.SyncPage(s);
  else if (page === 'notifications') box.innerHTML = P.NotificationsPage(s, notifView);
  else if (page === 'help') box.innerHTML = P.HelpPage();
  else if (page === 'profile') box.innerHTML = P.ProfilePage(user, s, profileRange);
  else box.innerHTML = P.TasksPage(s, currentFilter, currentSub, taskView);

  try {
    wirePage(page, box);
  } catch (e) {
    console.warn('Creeky wirePage:', e);
  }
  // Reabrir detalles que el usuario tenía abiertos (ej. al tocar días 🔁)
  openDetails.forEach(id => {
    try {
      const d = document.querySelector(`#detail-${id}`);
      if (d) d.classList.remove('hidden');
    } catch { /* id inválido, se ignora */ }
  });
  refreshBadges();
  $('#sidebar').classList.remove('open');
  $('#sidebar-overlay').classList.add('hidden');
}

/* ---- Acciones por página (delegación) ---- */
function wirePage(page, root) {
  const s = db.load();
  const save = () => { db.save(s); route(); };
  // Definido AQUÍ arriba: todo lo de abajo (Eisenhower, Sync, Perfil…) lo usa
  const act = (sel, fn) => { const b = root.querySelector(`[data-act="${sel}"]`); if (b) b.onclick = fn; };

  // Tareas: listas contienen tareas; sub-vistas pendientes / completadas / eliminadas
  $$('[data-list]', root).forEach(b => b.onclick = () => { currentFilter = b.dataset.list; if (currentFilter==='trash') currentSub='trash'; else if (currentSub==='trash') currentSub='open'; openDetails.clear(); route(); });
  $$('[data-sub]', root).forEach(b => b.onclick = () => { currentSub = b.dataset.sub; openDetails.clear(); route(); });
  // Filtros de Tareas (no cierran detalles abiertos)
  const fp = $('#f-prio', root), ft = $('#f-tag', root), fs = $('#f-sort', root);
  if (fp) fp.onchange = () => { taskView.prio = fp.value; route(); };
  if (ft) ft.onchange = () => { taskView.tag = ft.value; route(); };
  if (fs) fs.onchange = () => { taskView.sort = fs.value; route(); };
  // Vista 📄 Lista / 🗂️ Tablero + mover entre listas (select y drag & drop)
  $$('[data-layout]', root).forEach(b => b.onclick = () => { taskView.layout = b.dataset.layout; route(); });
  $$('[data-moveto]', root).forEach(sel => sel.onchange = () => {
    const t = s.tasks.find(x => x.id === sel.dataset.moveto); if (!t) return;
    const target = s.lists.find(l => l.id === sel.value);
    t.list = sel.value; t.deleted = false; t.deletedAt = null;
    openDetails.delete(t.id); db.save(s); route();
    toast(`"${t.title}" movida a ${target ? target.name : sel.value}.`, 'success');
  });
  $$('[data-drag]', root).forEach(el => el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', el.dataset.drag);
    e.dataTransfer.effectAllowed = 'move';
  }));
  $$('[data-dropzone]', root).forEach(z => {
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drop-hint'); });
    z.addEventListener('dragleave', () => z.classList.remove('drop-hint'));
    z.addEventListener('drop', e => {
      e.preventDefault(); z.classList.remove('drop-hint');
      const id = e.dataTransfer.getData('text/plain');
      const t = s.tasks.find(x => x.id === id); if (!t) return;
      const zone = z.dataset.dropzone;
      if (zone === '__trash') {
        if (t.deleted) return;
        t.deleted = true; t.deletedAt = Date.now();
        db.save(s); route(); toast(`"${t.title}" movida a Eliminadas.`, 'warning');
      } else if (t.list !== zone || t.deleted) {
        t.list = zone; t.deleted = false; t.deletedAt = null;
        const target = s.lists.find(l => l.id === zone);
        db.save(s); route(); toast(`"${t.title}" movida a ${target ? target.name : zone}.`, 'success');
      }
    });
  });
  // Calendario: vistas Año/Mes/Semana/Día/multi + navegación del periodo
  $$('[data-calview]', root).forEach(b => b.onclick = () => { calView.mode = b.dataset.calview; calView.offset = 0; route(); });
  $$('[data-calnav]', root).forEach(b => b.onclick = () => {
    const v = b.dataset.calnav;
    calView.offset = v === '0' ? 0 : calView.offset + (+v);
    route();
  });
  $$('[data-calmonth]', root).forEach(b => b.onclick = () => {
    const [Y, M] = b.dataset.calmonth.split('-').map(Number);
    const now = new Date();
    calView.offset = (Y - now.getFullYear()) * 12 + (M - 1 - now.getMonth());
    calView.mode = 'month';
    route();
  });
  // Expandir día compacto (sin re-render)
  $$('[data-expandday]', root).forEach(b => b.onclick = () => {
    const x = b.nextElementSibling; if (!x) return;
    const hidden = x.classList.toggle('hidden');
    b.textContent = hidden ? `+${x.children.length} más` : '− menos';
  });
  const cl = $('#cal-list', root), ct = $('#cal-time', root);
  if (cl) cl.onchange = () => { calView.list = cl.value; route(); };
  if (ct) ct.onchange = () => { calView.onlyTime = ct.checked; route(); };
  act('clear-cal', () => { calView.offset = 0; calView.list = 'all'; calView.onlyTime = false; route(); toast('Filtros de calendario limpios.', 'info'); });
  // Filtros de Cuenta regresiva
  $$('[data-cview]', root).forEach(b => b.onclick = () => { countView = b.dataset.cview; route(); });
  // Filtros de Búsqueda
  const sl = $('#s-list', root), sp = $('#s-prio', root), ss = $('#s-state', root);
  if (sl) sl.onchange = () => { searchFilters.list = sl.value; route(); };
  if (sp) sp.onchange = () => { searchFilters.prio = sp.value; route(); };
  if (ss) ss.onchange = () => { searchFilters.state = ss.value; route(); };
  // Filtros de Notificaciones + lectura individual
  $$('[data-nview]', root).forEach(b => b.onclick = () => { notifView = b.dataset.nview; route(); });
  $$('[data-nread]', root).forEach(b => b.onclick = () => { const n = s.notifications.find(x=>x.id===b.dataset.nread); if(n) n.unread = false; db.save(s); route(); });
  // Rango de Perfil
  $$('[data-prange]', root).forEach(b => b.onclick = () => { profileRange = b.dataset.prange; route(); });
  // Pomodoro: tarjetas del día + historial filtros live (sin re-render)
  $$('[data-pomoday]', root).forEach(b => b.onclick = () => {
    const v = b.dataset.pomoday;
    $$('[data-pomoday]', root).forEach(x=>x.classList.toggle('active', x===b));
    const todayEl = $('#pomo-day-list', root), allEl = $('#pomo-all-list', root);
    if (todayEl && allEl) {
      if (v==='today') { todayEl.classList.remove('hidden'); allEl.classList.add('hidden'); }
      else { todayEl.classList.add('hidden'); allEl.classList.remove('hidden'); }
    }
  });
  $$('[data-pomofocus]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.pomofocus); if(!t) return;
    localStorage.setItem('creeky_focus', JSON.stringify({ id: t.id, title: t.title }));
    pushNotification(s, 'Enfoque Pomodoro activado', `"${t.title}" vinculada al temporizador.`, 'system');
    db.save(s); route(); toast(`Enfocando "${t.title}" en Pomodoro.`, 'success');
  });
  // Historial Pomodoro: filtros live (sin re-render)
  let plogRange = 'all', plogMode = 'all';
  const applyPlog = () => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    $$('.plog-row', root).forEach(r => {
      const okRange = plogRange === 'all' || (plogRange === 'today' ? r.dataset.date === todayISO() : new Date(r.dataset.date) >= weekAgo);
      const okMode = plogMode === 'all' || r.dataset.mode === plogMode;
      r.style.display = okRange && okMode ? '' : 'none';
    });
  };
  $$('[data-plog-range]', root).forEach(b => b.onclick = () => { plogRange = b.dataset.plogRange; $$('[data-plog-range]', root).forEach(x=>x.classList.toggle('active', x===b)); applyPlog(); });
  $$('[data-plog-mode]', root).forEach(b => b.onclick = () => { plogMode = b.dataset.plogMode; $$('[data-plog-mode]', root).forEach(x=>x.classList.toggle('active', x===b)); applyPlog(); });
  // Matriz: filtro de texto live
  const mf = $('#matrix-filter', root);
  if (mf) mf.oninput = () => {
    const q = mf.value.toLowerCase();
    $$('.q-item', root).forEach(it => { it.style.display = it.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  };
  // Hábitos: filtros live por racha
  $$('[data-hfilter]', root).forEach(b => b.onclick = () => {
    $$('[data-hfilter]', root).forEach(x=>x.classList.toggle('active', x===b));
    const f = b.dataset.hfilter;
    $$('.habit-row', root).forEach(r => {
      const st = +(r.dataset.streak || 0);
      const show = f === 'all' || (f === 'active' && st > 0) || (f === 'hot' && st >= 5) || (f === 'fresh' && st === 0);
      r.style.display = show ? '' : 'none';
    });
  });
  // Ayuda: filtro live
  const hf = $('#help-filter', root);
  if (hf) hf.oninput = () => {
    const q = hf.value.toLowerCase();
    $$('.help-card', root).forEach(c => { c.style.display = c.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  };
  // Sync: inspector de colecciones (live)
  const si2 = $('#sync-inspect', root);
  if (si2) {
    const drawInspect = () => {
      const k = si2.value;
      const arr = s[k] || [];
      $('#sync-count', root).textContent = Array.isArray(arr) ? `${arr.length} elemento(s)` : typeof arr;
      $('#sync-preview', root).textContent = JSON.stringify(arr, null, 2).slice(0, 2000);
    };
    si2.onchange = drawInspect; drawInspect();
  }
  const inline = $('#inline-add', root);
  if (inline) inline.onsubmit = e => {
    e.preventDefault();
    const v = $('#inline-title', root).value.trim(); if (!v) return;
    const due = currentFilter==='today' ? todayISO() : '';
    const cand = { id: uid('t'), title: v, description: '', list: ['all','today'].includes(currentFilter) ? 'inbox' : currentFilter, priority: 'none', due: due, dueTime: '', duration:30, repeat:[], remindBefore:15, reminder:'', reminded:false, quadrant:'', pomo:0, pomodoroBlocks:[], done: false, deleted: false, deletedAt: null, createdAt: Date.now(), tags: [] };
    s.tasks.unshift(cand);
    if (due) pushNotification(s, 'Calendario', `"${v}" programada ${due}`, 'calendar');
    db.save(s); route(); toast('Tarea creada en la lista. Visible en Calendario si tiene fecha.', 'success');
  };
  // Modales de creación (el contenido vive en index.html, fuera del re-render)
  act('open-list-modal', () => openListModal());
  act('open-tag-modal', openTagModal);
  // Menús de configuración de Listas / Etiquetas (engranaje junto al +)
  act('lists-menu', () => {
    root.querySelector('#tags-menu')?.classList.add('hidden');
    root.querySelector('#lists-menu')?.classList.toggle('hidden');
  });
  act('tags-menu', () => {
    root.querySelector('#lists-menu')?.classList.add('hidden');
    root.querySelector('#tags-menu')?.classList.toggle('hidden');
  });
  act('sort-lists-az', () => { taskView.listSort = !taskView.listSort; route(); });
  act('hide-empty-lists', () => { taskView.hideEmpty = !taskView.hideEmpty; route(); });
  act('sort-tags-az', () => { taskView.tagSort = !taskView.tagSort; route(); });
  act('clean-tags', () => {
    const used = new Set();
    s.tasks.forEach(t => (t.tags || []).forEach(x => used.add(x)));
    const gone = s.tags.filter(t => !used.has(t)).length;
    s.tags = s.tags.filter(t => used.has(t));
    db.save(s); route(); toast(gone ? `${gone} etiqueta(s) sin uso eliminadas.` : 'Todas las etiquetas están en uso.', gone ? 'warning' : 'info');
  });
  act('clear-filters', () => {
    taskView.prio = 'all'; taskView.tag = 'all'; taskView.sort = 'manual';
    currentSub = 'open'; openDetails.clear(); route(); toast('Filtros limpios.', 'info');
  });
  // Engranaje por lista: editar / eliminar / vaciar
  $$('[data-listedit]', root).forEach(b => b.onclick = () => openListModal(b.dataset.listedit));
  // Renombrar / eliminar etiquetas existentes (se actualizan en todas las tareas)
  $$('[data-tagdel]', root).forEach(b => b.onclick = () => {
    const old = b.dataset.tagdel;
    s.tags = s.tags.filter(t => t !== old);
    s.tasks.forEach(t => { t.tags = (t.tags || []).filter(x => x !== old); });
    if (taskView.tag === old) taskView.tag = 'all';
    db.save(s); route(); toast(`Etiqueta #${old} eliminada de todas las tareas.`, 'warning');
  });
  $$('[data-tagedit]', root).forEach(b => b.onclick = () => {
    const old = b.dataset.tagedit;
    const row = root.querySelector(`#tagrow-${CSS.escape(old)}`); if (!row) return;
    row.innerHTML = `<input class="form-input" id="tagedit-inp" value="${old}" style="flex:1;min-width:0"><button class="btn btn-primary btn-sm" id="tagedit-ok">OK</button>`;
    const inp = row.querySelector('#tagedit-inp'); inp.focus(); inp.select();
    const save = () => {
      const v = inp.value.trim().toLowerCase();
      if (!v) return;
      if (v !== old) {
        if (s.tags.includes(v)) { toast(`#${v} ya existe; se fusionan.`, 'warning'); }
        else s.tags = s.tags.map(t => t === old ? v : t);
        s.tasks.forEach(t => { t.tags = [...new Set((t.tags || []).map(x => x === old ? v : x))]; });
        if (taskView.tag === old) taskView.tag = v;
      }
      db.save(s); route(); toast('Etiqueta actualizada.', 'success');
    };
    row.querySelector('#tagedit-ok').onclick = save;
    inp.onkeydown = (e) => { if (e.key === 'Enter') save(); };
  });
  // Segmentos Hoy / Semana / Buzón: crean tareas SIN lista (Bandeja + preset de fecha)
  $$('[data-segadd]', root).forEach(b => b.onclick = () => {
    const k = b.dataset.segadd;
    openQuickAdd({ list: 'inbox', due: k === 'today' ? todayISO() : k === 'week' ? weekEndISO() : '' });
  });
  $$('[data-check]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.check); if(!t) return;
    t.done=!t.done;
    if (t.due) {
      if (t.done) pushNotification(s, 'Calendario', `"${t.title}" completada — liberada del ${t.due}`, 'calendar');
      else pushNotification(s, 'Calendario', `"${t.title}" reabierta para el ${t.due}`, 'calendar');
    }
    db.save(s); route(); toast(t.done?'Tarea completada.':'Tarea reabierta.', 'info');
  });
  $$('[data-del]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.del); if(!t) return;
    const hadDue = !!t.due;
    t.deleted = true; t.deletedAt = Date.now();
    if (hadDue) pushNotification(s, 'Calendario', `"${t.title}" eliminada del calendario`, 'calendar');
    db.save(s); route(); toast('Tarea movida a Eliminadas.', 'warning');
  });
  $$('[data-restore]', root).forEach(b => b.onclick = () => { const t = s.tasks.find(x=>x.id===b.dataset.restore); if(!t) return; t.deleted = false; t.deletedAt = null; db.save(s); route(); toast('Tarea restaurada.', 'success'); });
  $$('[data-permdel]', root).forEach(b => b.onclick = () => { if(!confirm('Eliminar definitivamente?')) return; s.tasks = s.tasks.filter(x=>x.id!==b.dataset.permdel); db.save(s); route(); });
  // Detalle: descripción / recordatorio / fecha-calendario / prioridad / etiquetas
  const markOpen = (id, isOpen) => { isOpen ? openDetails.add(id) : openDetails.delete(id); };
  $$('[data-toggle]', root).forEach(b => b.onclick = () => { const id = b.dataset.toggle; const d = root.querySelector(`#detail-${id}`); if(!d) return; d.classList.toggle('hidden'); markOpen(id, !d.classList.contains('hidden')); });
  $$('[data-desc]', root).forEach(b => b.onclick = () => { const d = root.querySelector(`#detail-${b.dataset.desc}`); if(d) { d.classList.remove('hidden'); markOpen(b.dataset.desc, true); } });
  $$('[data-editdesc]', root).forEach(b => b.onclick = () => { const d = root.querySelector(`#detail-${b.dataset.editdesc}`); if(d) { d.classList.remove('hidden'); markOpen(b.dataset.editdesc, true); } });
  $$('[data-setreminder]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.setreminder); if(!t) return;
    const d = root.querySelector(`#detail-${t.id}`); if(d) { d.classList.remove('hidden'); markOpen(t.id, true); }
    const inp = root.querySelector(`[data-reminder="${t.id}"]`); if(inp) { inp.focus(); inp.showPicker?.(); }
    toast('Pon fecha/hora de alarma y pulsa Guardar.', 'info');
  });
  $$('[data-cycleprio]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.cycleprio); if(!t) return;
    t.priority = PRIO_ORDER[(PRIO_ORDER.indexOf(t.priority)+1)%PRIO_ORDER.length]; db.save(s); route();
  });
  // Presets de fecha: hoy / mañana / semana / sin fecha
  $$('[data-preset]', root).forEach(b => b.onclick = () => {
    const [id, kind] = b.dataset.preset.split(':');
    const dueInput = root.querySelector(`[data-due="${id}"]`); if (!dueInput) return;
    if (kind === 'today') dueInput.value = todayISO();
    else if (kind === 'tomorrow') dueInput.value = addDaysISO(todayISO(), 1);
    else if (kind === 'week') dueInput.value = addDaysISO(todayISO(), 7);
    else dueInput.value = '';
    toast(kind==='clear' ? 'Fecha quitada.' : `Fecha puesta: ${dueInput.value}. Pulsa Guardar.`, 'info');
  });
  // Repetir días L-D: SIN re-render (cero flash, el detalle jamás se cierra)
  $$('[data-repeat]', root).forEach(b => b.onclick = () => {
    const [id, day] = b.dataset.repeat.split(':');
    const t = s.tasks.find(x=>x.id===id); if(!t) return;
    t.repeat = t.repeat || [];
    const d = +day;
    t.repeat = t.repeat.includes(d) ? t.repeat.filter(x=>x!==d) : [...t.repeat, d];
    db.save(s);
    // Actualización optimista solo del chip tocado + contador 
    b.classList.toggle('on', t.repeat.includes(d));
    const tag = root.querySelector(`#repeattag-${id}`);
    if (tag) {
      tag.style.display = t.repeat.length ? '' : 'none';
      tag.innerHTML = `↻ <b>${t.repeat.length}</b>d`;
      tag.title = t.repeat.length ? `Repite días: ${t.repeat.join(', ')}` : 'Días de repetición';
    }
    toast(t.repeat.length ? `Repite ${t.repeat.length} día(s) y sale en Calendario.` : 'Repetición quitada.', 'info');
  });
  // Timer en tarea: crea reserva Pomodoro (bloques según duración) + notificación, sin redirigir
  $$('[data-focus]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.focus); if(!t) return;
    const wasEmpty = !Array.isArray(t.pomodoroBlocks) || t.pomodoroBlocks.length===0;
    if (wasEmpty) {
      t.pomodoroBlocks = calcPomodoroBlocks(t.duration||30);
      const f = t.pomodoroBlocks.filter(x=>x.type==='focus').length;
      const mins = t.pomodoroBlocks.reduce((a,x)=>a+x.duration,0);
      pushNotification(s, 'Pomodoro reservado', `"${t.title}" — ${f} bloques de foco (${mins} min) en franja ${t.due||'sin fecha'} ${t.dueTime||''}`.trim(), 'system');
    }
    // También marca como enfoque activo (para que Pomodoro muestre la tarjeta destacada)
    localStorage.setItem('creeky_focus', JSON.stringify({ id: t.id, title: t.title }));
    db.save(s); route();
    const f2 = t.pomodoroBlocks.filter(x=>x.type==='focus').length;
    toast(wasEmpty ? `Reserva Pomodoro creada: ${f2} bloques para "${t.title}". Revisa Notificaciones.` : `Enfoque Pomodoro: "${t.title}" lista.`, 'success');
  });
  act('focus-done', () => {
    let f = null; try { f = JSON.parse(localStorage.getItem('creeky_focus') || 'null'); } catch {}
    const t = f?.id ? s.tasks.find(x => x.id === f.id) : null;
    if (t) t.done = true;
    localStorage.removeItem('creeky_focus');
    db.save(s); location.hash = '#tasks'; route();
    toast(t ? `"${t.title}" completada desde Pomodoro.` : 'Enfoque quitado.', 'success');
  });
  $$('[data-savedetail]', root).forEach(b => b.onclick = () => {
    const t = s.tasks.find(x=>x.id===b.dataset.savedetail); if(!t) return;
    const cand = {
      ...t,
      description: root.querySelector(`[data-descinput="${t.id}"]`).value,
      due: root.querySelector(`[data-due="${t.id}"]`).value,
      dueTime: root.querySelector(`[data-duetime="${t.id}"]`).value,
      duration: +root.querySelector(`[data-duration="${t.id}"]`).value || 30,
      remindBefore: +root.querySelector(`[data-remindbefore="${t.id}"]`).value ?? 15,
      priority: root.querySelector(`[data-priority="${t.id}"]`).value,
    };
    // Choque de franja: misma fecha + horas solapadas => bloquear
    const clash = findConflict(s, cand, t.id);
    const warn = root.querySelector(`#conflict-${t.id}`);
    if (clash) {
      const msg = `Choque de horario con "${clash.title}" (${clash.dueTime} +${clash.duration||30}min). Cambia la hora.`;
      if (warn) { warn.textContent = msg; warn.classList.remove('hidden'); }
      toast(msg, 'error');
      return;
    }
    Object.assign(t, cand);
    t.reminded = false;
    if (t.due && t.dueTime && (t.remindBefore ?? 0) > 0) {
      const [H, M] = t.dueTime.split(':').map(Number);
      const dt = new Date(`${t.due}T${t.dueTime || '09:00'}`);
      dt.setMinutes(dt.getMinutes() - t.remindBefore);
      t.reminder = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    }
    const tags = root.querySelector(`[data-tags="${t.id}"]`).value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    t.tags = [...new Set(tags)]; registerTags(s, tags);
    openDetails.delete(t.id);
    db.save(s);
    if (t.reminder) pushNotification(s, 'Recordatorio', `"${t.title}" — avisa ${t.remindBefore} min antes (${String(t.reminder).replace('T',' ')})`, 'reminder');
    if (t.due) pushNotification(s, 'Calendario', `"${t.title}" programada ${t.due}${t.dueTime?' '+t.dueTime:''}${(t.repeat||[]).length?' (repite)':''}`, 'calendar');
    db.save(s); route(); toast('Tarea programada: calendario, aviso y prioridad actualizados.', 'success');
  });

  // Eisenhower Kanban: la vista es la prioridad; el botón fija copia en notas manuales
  act('auto-matrix', () => {
    const alive = s.tasks.filter(t => !t.deleted && !t.done);
    const groups = { q1: [], q2: [], q3: [], q4: [] };
    alive.forEach(t => {
      const q = ({ high: 'q1', medium: 'q2', low: 'q3' }[(t.priority || 'none')] || 'q4');
      groups[q].push(t);
    });
    let n = 0;
    Object.entries(groups).forEach(([q, arr]) => {
      arr.forEach(t => {
        const label = `${t.title}${t.due ? ` (${t.due})` : ''}`;
        if (!s.matrix[q].includes(label)) { s.matrix[q].push(label); n++; }
      });
    });
    db.save(s); route(); toast(n ? `${n} tareas fijadas como notas` : 'Ya estaba todo fijado', 'success');
  });
  // Filtros de matriz + limpiar
  const ml = $('#matrix-list', root);
  if (ml) ml.onchange = () => { matrixView.list = ml.value; route(); };
  act('clear-matrix', () => { matrixView.list = 'all'; route(); toast('Filtros de matriz limpios.', 'info'); });
  // Drag & drop entre cuadrantes: mover tarea = cambiar su prioridad (se evidencia en todas partes)
  $$('[data-qdrag]', root).forEach(el => el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', 't:' + el.dataset.qdrag);
    e.dataTransfer.effectAllowed = 'move';
  }));
  $$('[data-qnotedrag]', root).forEach(el => el.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', 'n:' + el.dataset.qnotedrag);
    e.dataTransfer.effectAllowed = 'move';
  }));
  $$('[data-qdrop]', root).forEach(z => {
    z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drop-hint'); });
    z.addEventListener('dragleave', () => z.classList.remove('drop-hint'));
    z.addEventListener('drop', e => {
      e.preventDefault(); z.classList.remove('drop-hint');
      const raw = e.dataTransfer.getData('text/plain');
      const zone = z.dataset.qdrop;
      if (raw.startsWith('t:')) {
        const t = s.tasks.find(x => x.id === raw.slice(2)); if (!t) return;
        t.priority = Q_PRIO[zone] || 'none'; t.quadrant = '';
        db.save(s); route();
        toast(`"${t.title}" ahora es prioridad ${PRIO_META[t.priority].label} (${zone.toUpperCase()}).`, 'success');
      } else if (raw.startsWith('n:')) {
        const [q, i] = raw.slice(2).split(':');
        const item = (s.matrix[q] || []).splice(+i, 1)[0];
        if (item === undefined) return;
        s.matrix[zone].push(item);
        db.save(s); route(); toast(`Nota movida a ${zone.toUpperCase()}.`, 'success');
      }
    });
  });
  act('unfocus', () => { localStorage.removeItem('creeky_focus'); route(); });
  $$('[data-q]', root).forEach(f => f.onsubmit = e => { e.preventDefault(); const inp = f.querySelector('input'); if(!inp.value.trim())return; s.matrix[f.dataset.q].push(inp.value.trim()); db.save(s); route(); });
  $$('[data-qdel]', root).forEach(b => b.onclick = () => { const [q,i] = b.dataset.qdel.split(':'); s.matrix[q].splice(+i,1); db.save(s); route(); });
  // Hábitos (racha persistente: semana visible + historial)
  const ha = $('#habit-add', root);
  if (ha) ha.onsubmit = e => {
    e.preventDefault();
    const v = $('#habit-name', root).value.trim(); if (!v) return;
    s.habits.push({ id: uid('h'), name: v, streak: 0, best: 0, days: [0,0,0,0,0,0,0], history: {}, week: isoWeekKey(new Date()), notify: true, notifyTime: '09:00', lastPing: '' });
    db.save(s); route(); toast(`Hábito "${v}" creado con recordatorio diario.`, 'success');
  };
  $$('[data-h]', root).forEach(b => b.onclick = () => {
    const [id, i] = b.dataset.h.split(':');
    const h = s.habits.find(x => x.id === id); if (!h) return;
    const v = (h.days || [])[+i] ? 0 : 1;
    h.days[+i] = v; h.history = h.history || {};
    const iso = addDaysISO(mondayOfWeekKey(h.week || isoWeekKey(new Date())), +i);
    if (v) h.history[iso] = 1; else delete h.history[iso];
    h.streak = calcStreak(h); h.best = Math.max(h.best || 0, h.streak);
    db.save(s); route();
  });
  // Recordatorio diario del hábito (campana + hora)
  $$('[data-hnotify]', root).forEach(b => b.onclick = () => {
    const h = s.habits.find(x => x.id === b.dataset.hnotify); if (!h) return;
    h.notify = !h.notify; if (h.notify) h.lastPing = '';
    db.save(s); route(); toast(h.notify ? `Recordatorio activado para "${h.name}".` : `Recordatorio pausado para "${h.name}".`, 'info');
  });
  $$('[data-htime]', root).forEach(inp => inp.onchange = () => {
    const h = s.habits.find(x => x.id === inp.dataset.htime); if (!h || !inp.value) return;
    h.notifyTime = inp.value; h.lastPing = ''; db.save(s); route();
    toast(`"${h.name}" avisará a las ${inp.value}.`, 'success');
  });
  $$('[data-hdel]', root).forEach(b => b.onclick = () => { s.habits = s.habits.filter(x=>x.id!==b.dataset.hdel); db.save(s); route(); toast('Hábito eliminado.', 'warning'); });
  // Editar nombre de hábito en línea (sin recargar nada)
  $$('[data-hedit]', root).forEach(b => b.onclick = () => {
    const h = s.habits.find(x => x.id === b.dataset.hedit); if (!h) return;
    const cell = root.querySelector(`#habitname-${h.id}`); if (!cell) return;
    cell.innerHTML = `<span style="display:flex;gap:6px"><input class="form-input" id="hi-${h.id}" value="${h.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')}"><button class="btn btn-primary btn-sm" id="hs-${h.id}">OK</button></span>`;
    const inp = root.querySelector(`#hi-${h.id}`); inp.focus(); inp.select();
    const save = () => { const v = inp.value.trim(); if (v) h.name = v; db.save(s); route(); toast('Hábito actualizado.', 'success'); };
    root.querySelector(`#hs-${h.id}`).onclick = save;
    inp.onkeydown = (e) => { if (e.key === 'Enter') save(); };
  });

  // Countdown
  const ca = $('#count-add', root);
  if (ca) ca.onsubmit = e => { e.preventDefault(); s.countdowns.push({id:uid('c'), title:$('#c-title',root).value, date:$('#c-date',root).value, created:Date.now()}); db.save(s); route(); toast('Cuenta atrás creada.','success'); };
  $$('[data-cdel]', root).forEach(b => b.onclick = () => { s.countdowns = s.countdowns.filter(x=>x.id!==b.dataset.cdel); db.save(s); route(); toast('Cuenta atrás eliminada.', 'warning'); });
  // Editar evento en línea
  $$('[data-cedit]', root).forEach(b => b.onclick = () => {
    const id = b.dataset.cedit;
    root.querySelector(`#cview-${id}`)?.classList.add('hidden');
    root.querySelector(`#cedit-${id}`)?.classList.remove('hidden');
  });
  $$('[data-ceditsave]', root).forEach(b => b.onclick = () => {
    const c = s.countdowns.find(x => x.id === b.dataset.ceditsave); if (!c) return;
    const t = root.querySelector(`[data-ctitle="${c.id}"]`).value.trim();
    const d = root.querySelector(`[data-cdate="${c.id}"]`).value;
    if (!t || !d) { toast('Pon título y fecha.', 'warning'); return; }
    c.title = t; c.date = d; db.save(s); route(); toast('Evento actualizado.', 'success');
  });

  // Search en vivo
  const si = $('#search-input', root);
  if (si) si.oninput = () => { searchQuery = si.value; const pos = si.selectionStart; route(); const n = $('#search-input'); n.focus(); n.setSelectionRange(pos,pos); };

  // Sync
  act('sync-now', () => { const st = $('#sync-time'); if (st) st.textContent = new Date().toLocaleTimeString(); const dot = $('#sync-status'); if (dot) dot.className='nav-status online'; toast('Sincronizado (local).','success'); });
  act('export', () => {
    try {
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'creeky-backup.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('JSON descargado. Guárdalo en Descargas o Creeky/backups/.', 'success');
    } catch (err) {
      // Plan B: mostrar el JSON para copiarlo a mano
      prompt('No se pudo descargar. Copia tu respaldo:', JSON.stringify(s).slice(0, 2000));
      toast('Descarga bloqueada: ' + err.message, 'error');
    }
  });
  act('wipe', () => { if(confirm('¿Borrar todo?')) { localStorage.clear(); location.reload(); } });
  // Vaciar papelera en 2 pasos (sin diálogos nativos que se pierdan)
  $$('[data-act="empty-trash"]', root).forEach(eb => eb.onclick = () => {
    if (eb.dataset.armed) {
      const n = s.tasks.filter(t => t.deleted).length;
      s.tasks = s.tasks.filter(t => !t.deleted);
      db.save(s); route(); toast(`Papelera vaciada: ${n} registro(s) eliminados del todo.`, 'warning');
    } else {
      eb.dataset.armed = '1';
      eb.dataset.label = eb.textContent;
      eb.textContent = '¿Seguro? Clic de nuevo para vaciar del todo';
      setTimeout(() => {
        if (!document.contains(eb)) return;
        delete eb.dataset.armed;
        eb.textContent = eb.dataset.label || 'Vaciar papelera';
      }, 5000);
    }
  });
  const imp = $('#import-file', root);
  if (imp) imp.onchange = () => {
    const f = imp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.tasks || !data.lists) throw new Error('formato inválido');
        const keepSession = db.load().session, keepUsers = db.load().users;
        db.save({ tags: data.tags || ['trabajo','personal','urgente'], users: data.users || keepUsers, session: data.session ?? keepSession, tasks: data.tasks, lists: data.lists, habits: data.habits || [], matrix: data.matrix || {q1:[],q2:[],q3:[],q4:[]}, countdowns: data.countdowns || [], pomoLog: data.pomoLog || [], notifications: data.notifications || [] });
        route(); toast(`Respaldo importado: ${data.tasks.length} tareas, ${data.lists.length} listas.`, 'success');
      } catch (err) { toast('No pude importar: ' + err.message, 'error'); }
    };
    r.readAsText(f);
  };
  act('read-all', () => { s.notifications.forEach(n=>n.unread=false); db.save(s); route(); });

  // Perfil
  act('save-profile', () => { const u = Auth.currentUser(); const ss = db.load(); const full = ss.users.find(x=>x.id===u.id); full.name = $('#pf-name').value || full.name; db.save(ss); route(); toast('Perfil guardado.','success'); });
  act('edit-profile', () => toast('Edita tu nombre abajo y pulsa Guardar.'));
  act('quick-add', () => openQuickAdd());
}

/* ---- Quick add modal (configuración completa: fecha, hora, repetir, etiquetas) ---- */
const quickRepeat = new Set();
// Preview de bloques Pomodoro del modal: se muestra solo si la reserva está activa
function renderPomoPreview() {
  const prev = $('#pomodoro-preview'), box = $('#pomodoro-blocks');
  if (!prev || !box) return;
  const on = $('#task-pomodoro')?.checked;
  if (!on) { prev.setAttribute('hidden', ''); box.innerHTML = ''; return; }
  const blocks = calcPomodoroBlocks(+($('#task-duration')?.value) || 30);
  const f = blocks.filter(b => b.type === 'focus').length;
  const mins = blocks.reduce((a, b) => a + b.duration, 0);
  const label = { focus: 'Foco', shortBreak: 'Descanso', longBreak: 'Descanso largo' };
  box.innerHTML = blocks.map(b => `<span class="${b.type === 'shortBreak' ? 'shortbreak' : b.type === 'longBreak' ? 'longbreak' : 'focus'}" title="${label[b.type] || b.type} ${b.duration} min"></span>`).join('')
    + `<span class="pomo-preview-text">${f} foco${f === 1 ? '' : 's'} • ${mins} min</span>`;
  prev.removeAttribute('hidden');
}
function openQuickAdd(preset = {}) {
  const s = db.load();
  // Refrescar listas siempre (si no, las nuevas listas no salen y todo cae en Bandeja)
  const sel = $('#task-list');
  sel.innerHTML = '';
  s.lists.forEach(l => {
    const o = document.createElement('option');
    o.value = l.id; o.textContent = `${l.icon || ''} ${l.name}`.trim();
    if (l.id === (preset.list || currentFilter)) o.selected = true;
    sel.appendChild(o);
  });
  // Sugerencias de etiquetas del modal
  const dl = $('#tag-options-modal');
  if (dl) dl.innerHTML = (s.tags || []).map(t => `<option value="${t}">`).join('');
  // Repetir: limpio en cada apertura
  quickRepeat.clear();
  document.querySelectorAll('#task-repeat [data-qrep]').forEach(b => b.classList.remove('on'));
  // Priority swatches: render + selección según preset
  const prioVal = preset.priority || $('#task-priority').value || 'none';
  const swWrap = $('#priority-swatches');
  if (swWrap && !swWrap.children.length) {
    const metas = [
      {v:'high', mark:'!', label:'Alta'},
      {v:'medium', mark:'!', label:'Media'},
      {v:'low', mark:'!', label:'Baja'},
      {v:'none', mark:'○', label:'Ninguna'},
    ];
    metas.forEach(m=>{
      const b=document.createElement('button');
      b.type='button'; b.className='priority-swatch'; b.dataset.priority=m.v;
      b.innerHTML=`<span class="mark">${m.mark}</span><span class="label">${m.label}</span>`;
      swWrap.appendChild(b);
    });
  }
  $('#task-priority').value = prioVal;
  document.querySelectorAll('.priority-swatch').forEach(b => {
    b.classList.toggle('selected', b.dataset.priority === prioVal);
    b.onclick = () => {
      document.querySelectorAll('.priority-swatch').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      $('#task-priority').value = b.dataset.priority;
    };
  });
  // Pomodoro checkbox
  $('#task-pomodoro').checked = false;
  renderPomoPreview();
  if (preset.due !== undefined) $('#task-date').value = preset.due || '';
  $('#quick-add-modal').classList.remove('hidden');
  setTimeout(() => $('#task-title')?.focus(), 50);
}
function closeQuickAdd() { $('#quick-add-modal').classList.add('hidden'); }

/* ---- Modal Lista: crear y editar ---- */
let pickColor = '#3949AB', pickEmoji = '📋', editingListId = null;
function openListModal(editId = null) {
  const s = db.load();
  const l = editId ? s.lists.find(x => x.id === editId) : null;
  editingListId = l ? l.id : null;
  pickColor = l?.color || '#3949AB';
  pickEmoji = l?.icon || '📋';
  $('#list-form').reset();
  $('#nl-name').value = l?.name || '';
  $('#nl-desc').value = l?.description || '';
  $('#nl-color').value = pickColor;
  $('#nl-emoji').value = pickEmoji;
  $('#nl-emoji-view').textContent = pickEmoji;
  $('#nl-emoji-search').value = '';
  $('#list-modal-title').textContent = l ? 'Editar lista' : 'Nueva lista';
  $('#nl-submit').textContent = l ? 'Guardar cambios' : 'Crear lista';
  $('#nl-delete').classList.toggle('hidden', !l);
  renderSwatches(); renderEmojiGrid();
  $('#list-modal').classList.remove('hidden');
  setTimeout(() => $('#nl-name')?.focus(), 50);
}
function openTagModal() {
  $('#tag-form').reset();
  $('#tg-preview').textContent = '#etiqueta';
  $('#tag-modal').classList.remove('hidden');
  setTimeout(() => $('#tg-name')?.focus(), 50);
}

// Paleta + galería del modal (scope de módulo: se llaman al abrir)
const PALETTE = ['#212121', '#616161', '#3949AB', '#00897B', '#2E7D32', '#B58900', '#C62828', '#6A1B9A', '#EF6C00', '#0277BD'];
function renderSwatches() {
  const w = $('#nl-swatches'); if (!w) return; w.innerHTML = '';
  PALETTE.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch' + (c === pickColor ? ' sel' : '');
    b.style.background = c; b.title = c;
    b.onclick = () => { pickColor = c; $('#nl-color').value = c; renderSwatches(); };
    w.appendChild(b);
  });
}
function renderEmojiGrid(filter = '') {
  const g = $('#nl-emoji-grid'); if (!g) return; g.innerHTML = '';
  const q = filter.trim().toLowerCase();
  EMOJI_GRID.forEach(({ cat, items }) => {
    const hit = items.filter(e => !q || e.includes(filter.trim()) || cat.toLowerCase().includes(q));
    if (!hit.length) return;
    const label = document.createElement('div');
    label.className = 'emoji-cat'; label.textContent = cat; g.appendChild(label);
    hit.forEach(e => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = e; b.title = e;
      if (e === pickEmoji) b.classList.add('sel');
      b.onclick = () => {
        pickEmoji = e;
        $('#nl-emoji').value = e; $('#nl-emoji-view').textContent = e;
        g.querySelectorAll('button').forEach(x => x.classList.toggle('sel', x.textContent === e));
      };
      g.appendChild(b);
    });
  });
}

/* ---- Init ---- */
window.addEventListener('hashchange', route);
// Nada falla en silencio: cualquier error se muestra en rojo para poder reportarlo
window.addEventListener('error', (e) => {
  try {
    console.warn('Creeky error:', e.message, e.filename);
    toast('Error: ' + (e.message || 'desconocido') + ' — F12/Consola para detalle', 'error');
  } catch { /* toast aún no listo, solo consola */ }
});
window.addEventListener('DOMContentLoaded', () => {
  // Sidebar
  $('.sidebar-toggle').onclick = () => $('#sidebar').classList.toggle('collapsed');
  $('.mobile-menu-toggle').onclick = () => { $('#sidebar').classList.add('open'); $('#sidebar-overlay').classList.remove('hidden'); };
  $('#sidebar-overlay').onclick = () => { $('#sidebar').classList.remove('open'); $('#sidebar-overlay').classList.add('hidden'); };

  // User dropdown
  const avatar = $('.user-avatar'), drop = $('.user-dropdown');
  avatar.onclick = e => { e.stopPropagation(); drop.classList.toggle('hidden'); };
  document.addEventListener('click', () => drop.classList.add('hidden'));
  $('#logout-btn').onclick = () => { Auth.signOut(); location.reload(); };

  // Modales cerrar (todos)
  $$('.modal-close').forEach(b => b.onclick = () => $$('.modal-overlay').forEach(m => m.classList.add('hidden')));
  $$('.modal-overlay').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));

  // ---- Modal Nueva lista: listeners del DOM estático ----
  $('#nl-color').oninput = e => { pickColor = e.target.value; renderSwatches(); };
  $('#nl-emoji-search').oninput = e => renderEmojiGrid(e.target.value);
  $('#list-form').onsubmit = e => {
    e.preventDefault();
    const s = db.load();
    const name = $('#nl-name').value.trim(); if (!name) return;
    if (editingListId) {
      const l = s.lists.find(x => x.id === editingListId);
      if (l) {
        l.name = name; l.description = $('#nl-desc').value.trim();
        l.color = $('#nl-color').value; l.icon = $('#nl-emoji').value || '📋';
      }
      db.save(s); editingListId = null;
      $('#list-modal').classList.add('hidden');
      route(); toast(`Lista ${l?.icon || ''} "${name}" actualizada.`, 'success');
    } else {
      const l = { id: uid('l'), name, description: $('#nl-desc').value.trim(), color: $('#nl-color').value, icon: $('#nl-emoji').value || '📋' };
      s.lists.push(l); db.save(s);
      $('#list-modal').classList.add('hidden');
      currentFilter = l.id; currentSub = 'open'; route();
      toast(`Lista ${l.icon} "${name}" creada.`, 'success');
    }
  };
  $('#nl-delete').onclick = () => {
    if (!editingListId) return;
    const s = db.load();
    const l = s.lists.find(x => x.id === editingListId);
    if (!l) return;
    const n = s.tasks.filter(t => t.list === l.id && !t.deleted).length;
    if (!confirm(`¿Eliminar "${l.name}"? Sus ${n} tarea(s) irán a la papelera.`)) return;
    s.tasks.forEach(t => { if (t.list === l.id && !t.deleted) { t.deleted = true; t.deletedAt = Date.now(); } });
    s.lists = s.lists.filter(x => x.id !== l.id);
    db.save(s); editingListId = null;
    $('#list-modal').classList.add('hidden');
    if (currentFilter === l.id) currentFilter = 'inbox';
    route(); toast(`Lista "${l.name}" eliminada (${n} a papelera).`, 'warning');
  };

  // ---- Modal Nueva etiqueta ----
  $('#tg-name').oninput = e => { $('#tg-preview').textContent = '#' + (e.target.value.trim().toLowerCase() || 'etiqueta'); };
  $('#tag-form').onsubmit = e => {
    e.preventDefault();
    const s = db.load();
    const v = $('#tg-name').value.trim().toLowerCase(); if (!v) return;
    if (s.tags.includes(v)) { toast(`#${v} ya existe.`, 'warning'); return; }
    s.tags.push(v); db.save(s);
    $('#tag-modal').classList.add('hidden');
    route(); toast(`Etiqueta #${v} creada.`, 'success');
  };

  // Quick add form (el modal; la barra superior ya no trae Añadir/Buscar)
  const qf = $('#quick-add-form');
  // Chips de repetición del modal (se cablean una vez: el modal es estático)
  $$('#task-repeat [data-qrep]').forEach(b => b.onclick = () => {
    const d = +b.dataset.qrep;
    quickRepeat.has(d) ? quickRepeat.delete(d) : quickRepeat.add(d);
    b.classList.toggle('on', quickRepeat.has(d));
  });
  // Preview Pomodoro del modal: se actualiza al activar la reserva o cambiar duración
  $('#task-pomodoro')?.addEventListener('change', renderPomoPreview);
  $('#task-duration')?.addEventListener('change', renderPomoPreview);

  qf.onsubmit = e => {
    e.preventDefault();
    const s = db.load();
    const tags = $('#task-tags').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
    registerTags(s, tags);
    const pomodoroEl = $('#task-pomodoro');
    const pomodoroChecked = pomodoroEl ? pomodoroEl.checked : false;
    const duration = +$('#task-duration').value || 30;
    const pomodoroBlocks = pomodoroChecked ? calcPomodoroBlocks(duration) : [];
    const cand = { id: uid('t'), title: $('#task-title').value.trim(), description: $('#task-desc').value.trim(), list: $('#task-list').value, priority: $('#task-priority').value, due: $('#task-date').value, dueTime: $('#task-time').value, duration: duration, repeat: [...quickRepeat], remindBefore: +$('#task-remindbefore').value ?? 15, reminder: '', reminded: false, quadrant: '', pomo: 0, pomodoroBlocks: pomodoroBlocks, done:false, deleted:false, deletedAt:null, createdAt:Date.now(), tags };
    const clash = findConflict(s, cand);
    if (clash) { toast(`Esa franja está ocupada por "${clash.title}" (${clash.dueTime}). Elige otra hora.`, 'error'); return; }
    s.tasks.unshift(cand);
    const t = s.tasks[0];
    if (t.due && t.dueTime && (t.remindBefore ?? 0) > 0) {
      const dt = new Date(`${t.due}T${t.dueTime}`);
      dt.setMinutes(dt.getMinutes() - t.remindBefore);
      t.reminder = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    }
    if (t.reminder) pushNotification(s, 'Recordatorio', `"${t.title}" — avisa ${t.remindBefore} min antes`, 'reminder');
    if (t.due) pushNotification(s, 'Calendario', `"${t.title}" programada ${t.due}${t.dueTime?' '+t.dueTime:''}`, 'calendar');
    // Pomodoro: si se marcó la reserva, crea la notificación y aviso
    if (pomodoroChecked && t.pomodoroBlocks.length > 0) {
      const focusBlocks = t.pomodoroBlocks.filter(b => b.type === 'focus').length;
      const totalMin = t.pomodoroBlocks.reduce((a, b) => a + b.duration, 0);
      pushNotification(s, 'Pomodoro reservado', `"${t.title}" — ${focusBlocks} bloques de foco (${totalMin} min total). Sesión lista para iniciar.`, 'system');
      toast(`🍅 Pomodoro reservado: ${focusBlocks} bloques de foco (${totalMin} min).`, 'success');
    }
    db.save(s); qf.reset(); quickRepeat.clear(); closeQuickAdd(); route(); toast('Tarea creada con fecha, hora y aviso.','success');
  };
  // Vigilante de alarmas: tareas + recordatorio diario de hábitos (no perder la racha)
  const checkReminders = () => {
    const s = db.load(); let changed = false, habitPing = false;
    const now = new Date();
    s.tasks.forEach(t => {
      if (t.deleted || t.done || t.reminded || !t.reminder) return;
      if (new Date(t.reminder) <= now) {
        t.reminded = true; changed = true;
        pushNotification(s, '¡Es hora!', `"${t.title}" — era para ${t.due || ''} ${t.dueTime || ''}`.trim(), 'reminder');
      }
    });
    // Hábitos: un aviso por día si a su hora aún no se marcó hoy
    const tISO = todayISO();
    const idx = (now.getDay() + 6) % 7;
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    (s.habits || []).forEach(h => {
      if (!h.notify || h.lastPing === tISO) return;
      if ((h.days || [])[idx]) return;
      if (hm < (h.notifyTime || '09:00')) return;
      h.lastPing = tISO; changed = true; habitPing = true;
      pushNotification(s, `Completa tu hábito: ${h.name}`, `Racha de ${h.streak || 0} en juego. Márcalo hoy para no perderla.`, 'reminder');
    });
    if (changed) {
      db.save(s); refreshBadges();
      if ((location.hash || '') === '#notifications' || (location.hash || '') === '#habits') route();
      else toast(habitPing ? 'Tienes hábitos por completar hoy. Míralos en Notificaciones.' : 'Tienes una alarma vencida. Mírala en Notificaciones.', 'warning');
    }
  };
  setInterval(checkReminders, 30000);
  setTimeout(checkReminders, 3000);

  // Atajo Ctrl/⌘+K -> va a página Búsqueda (la barra superior ya no trae buscador)
  document.addEventListener('keydown', e => { if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k') { e.preventDefault(); location.hash='#search'; setTimeout(()=>$('#search-input')?.focus(),50); } });

  // Sesión
  if (Auth.currentUser()) enterApp();
  else { $('#main-app').classList.add('hidden'); openAuth('signin'); }
});

