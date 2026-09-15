// Creeky - Templates HTML de las 11 secciones + Perfil
import { db, uid, PRIO_META, LIST_EMOJIS, WEEKDAYS, REMIND_OPTIONS, occursOn, listColor, todayISO, addDaysISO, weekEndISO, mondayOfWeekKey, isoWeekKey, APP_VERSION } from './store.js?v=31';
import { ic } from './icons.js?v=31';

// Insignia de prioridad: signo de admiración con color (roja/amarilla/verde/gris)
export const prioBadge = (p) => {
  const m = PRIO_META[p || 'none'] || PRIO_META.none;
  return `<span class="prio-badge" style="--prio:${m.color}" title="Prioridad ${m.label}">${m.mark}</span>`;
};

export const TITLES = {
  tasks: 'Tareas', calendar: 'Calendario', pomodoro: 'Pomodoro',
  eisenhower: 'Matriz Eisenhower', habits: 'Hábitos', countdown: 'Cuenta regresiva',
  search: 'Búsqueda', sync: 'Sincronización', notifications: 'Notificaciones',
  help: 'Ayuda', profile: 'Perfil'
};

/* ---------- 0. PERFIL ---------- */
export function ProfilePage(user, s, range='all') {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const weekAgo = Date.now() - 7*864e5;
  const alive = s.tasks.filter(t => !t.deleted && (range==='all' || (t.createdAt||0) >= weekAgo));
  const done = alive.filter(t => t.done).length;
  const focusMin = (s.pomoLog||[]).filter(p=>p.mode==='focus'&&(range==='all'||(p.ts||0)>=weekAgo)).reduce((a,p)=>a+(+p.minutes||0),0);
  return `<section class="page" aria-labelledby="h-profile">
    <div class="card profile-head">
      <div class="profile-avatar">${(user?.name || 'U')[0].toUpperCase()}</div>
      <div><h2 id="h-profile">${esc(user?.name || 'Usuario')}</h2>
      <p class="text-secondary">${esc(user?.email || '')} • Miembro desde ${user ? new Date(user.created).toLocaleDateString() : 'hoy'}</p></div>
      <div class="page-actions" style="margin-left:auto"><button class="btn btn-secondary" data-act="edit-profile">Editar</button></div>
    </div>
    <div class="filter-bar" role="group" aria-label="Rango de estadísticas" style="padding:16px 0 0">
      <span class="filter-label">Estadísticas:</span>
      <button class="chip ${range==='all'?'active':''}" data-prange="all">Todo</button>
      <button class="chip ${range==='week'?'active':''}" data-prange="week">Últimos 7 días</button>
    </div>
    <div class="stat-row">
      <div class="card stat"><b>${alive.length}</b><span>Tareas</span></div>
      <div class="card stat"><b>${done}</b><span>Completadas</span></div>
      <div class="card stat"><b>${focusMin}</b><span>Min. de foco</span></div>
      <div class="card stat"><b>${s.habits.length}</b><span>Hábitos</span></div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card card-pad"><h3>Por lista</h3>
        ${s.lists.map(l=>{const lt=alive.filter(t=>t.list===l.id);return `<div class="breakdown-row"><i style="background:${l.color}"></i><span>${esc(l.name)}</span><b>${lt.filter(t=>t.done).length}/${lt.length}</b></div>`;}).join('')}
      </div>
      <div class="card card-pad"><h3>Por prioridad</h3>
        ${Object.entries(PRIO_META).map(([v,m])=>{const n=alive.filter(t=>(t.priority||'none')===v).length;return `<div class="breakdown-row"><span>${prioBadge(v)} ${m.label}</span><b>${n}</b></div>`;}).join('')}
      </div>
    </div>
    <div class="card card-pad" style="margin-top:16px">
      <h3>Preferencias</h3>
      <p class="text-secondary text-sm">Tema monocromo (blanco ↔ negro) por ahora. El color se añadirá después.</p>
      <div class="form-row" style="margin-top:12px">
        <div class="form-group"><label class="form-label">Nombre</label><input class="form-input" id="pf-name" value="${user?.name || ''}"></div>
        <div class="form-group"><label class="form-label">Vista inicial</label><select class="form-select" id="pf-home"><option>Tareas</option><option>Calendario</option><option>Pomodoro</option></select></div>
      </div>
      <div class="form-actions"><button class="btn btn-primary" data-act="save-profile">Guardar</button></div>
    </div>
  </section>`;
}

/* ---------- 1. TAREAS / LISTAS ---------- */
export function TasksPage(s, filter='inbox', sub='open', view={prio:'all',tag:'all',sort:'manual'}) {
  const lists = s.lists;
  const alive = s.tasks.filter(t => !t.deleted);
  const inScope = alive.filter(t => filter==='all' ? true : filter==='today' ? t.due===todayISO() : filter==='trash' ? false : t.list===filter);
  const open = inScope.filter(t=>!t.done), doneT = inScope.filter(t=>t.done);
  const trash = s.tasks.filter(t=>t.deleted);
  // Filtros de visualización: prioridad + etiqueta + orden
  const applyView = (list) => {
    let r = list;
    if (view.prio !== 'all') r = r.filter(t => (t.priority||'none') === view.prio);
    if (view.tag !== 'all') r = r.filter(t => (t.tags||[]).includes(view.tag));
    const PRIO_W = { high: 0, medium: 1, low: 2, none: 3 };
    if (view.sort === 'due') r = [...r].sort((a,b) => (a.due||'9999') < (b.due||'9999') ? -1 : 1);
    else if (view.sort === 'prio') r = [...r].sort((a,b) => PRIO_W[a.priority||'none'] - PRIO_W[b.priority||'none']);
    else if (view.sort === 'title') r = [...r].sort((a,b) => a.title.localeCompare(b.title, 'es'));
    return r;
  };
  let shown = applyView(filter==='trash' ? trash : sub==='done' ? doneT : sub==='trash' ? trash : open);
  // En Tablero se ven TODAS las listas (ignora el filtro de lista, mantiene sub/prio/tag/orden)
  const boardShown = applyView(sub==='trash' ? trash : alive.filter(t => sub==='done' ? t.done : !t.done));
  // Listas/etiquetas visibles según menú (orden A–Z / ocultar vacías) — ANTES del tablero que las usa
  let visLists = [...lists];
  if (view.hideEmpty) visLists = visLists.filter(l => alive.some(t => t.list === l.id && !t.done));
  if (view.listSort) visLists.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  let visTags = [...(s.tags || [])];
  if (view.tagSort) visTags.sort((a, b) => a.localeCompare(b, 'es'));
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const escA = v => esc(v).replace(/"/g, '&quot;');
  let focusId = null;
  try { const ff = JSON.parse(localStorage.getItem('creeky_focus') || 'null'); focusId = ff?.id || null; } catch {}

  const taskRow = t => { const prio = t.priority || 'none';
  return `<article class="task-item ${t.done?'done':''}" data-id="${t.id}" style="border-left:4px solid ${listColor(s, t.list)}">
    <button class="task-check ${t.done?'done':''}" data-check="${t.id}" aria-label="Casilla completar">${t.done?'✓':''}</button>
    <div class="task-body">
      <div class="task-title">${esc(t.title)}</div>
      ${t.description ? `<button class="task-desc-toggle" data-desc="${t.id}">Ver descripción</button><p class="task-desc hidden" id="desc-${t.id}">${esc(t.description)}</p>` : `<button class="task-desc-toggle" data-editdesc="${t.id}">+ Añadir descripción</button>`}
      <div class="task-detail hidden" id="detail-${t.id}">
        <textarea class="form-textarea" data-descinput="${t.id}" placeholder="Descripción…">${esc(t.description)}</textarea>
        <div class="preset-row" role="group" aria-label="Fecha rápida">
          <button class="chip" data-preset="${t.id}:today">Hoy</button>
          <button class="chip" data-preset="${t.id}:tomorrow">Mañana</button>
          <button class="chip" data-preset="${t.id}:week">Esta semana</button>
          <button class="chip" data-preset="${t.id}:clear">Sin fecha</button>
        </div>
        <div class="task-detail-row">
          <label>${ic('calendar', 16)} <input type="date" class="form-input" data-due="${t.id}" value="${t.due||''}" title="Fecha — vincula con Calendario"></label>
          <label>${ic('clock', 16)} <input type="time" class="form-input" data-duetime="${t.id}" value="${t.dueTime||''}" title="Hora de la franja"></label>
          <label>Duración <select class="form-select" data-duration="${t.id}" title="Duración de la franja">
            ${[15,30,45,60,90,120].map(d=>`<option value="${d}" ${(t.duration||30)===d?'selected':''}>${d} min</option>`).join('')}
          </select></label>
        </div>
        <div class="repeat-row"><span class="repeat-label">Repetir:</span>
          ${WEEKDAYS.map(w=>`<button class="day-chip ${(t.repeat||[]).includes(w.v)?'on':''}" data-repeat="${t.id}:${w.v}" title="Repetir ${w.label}">${w.label}</button>`).join('')}
        </div>
        <div class="task-detail-row">
          <label>${ic('bell', 16)} Avisar <select class="form-select" data-remindbefore="${t.id}">
            ${REMIND_OPTIONS.map(o=>`<option value="${o.v}" ${(t.remindBefore??15)===o.v?'selected':''}>${o.label}</option>`).join('')}
          </select></label>
          <label>${prioBadge(prio)} Prioridad <select class="form-select" data-priority="${t.id}">
            ${Object.entries(PRIO_META).map(([v,m])=>`<option value="${v}" ${prio===v?'selected':''}>${m.label}</option>`).join('')}
          </select></label>
        </div>
        <div class="conflict-warn hidden" id="conflict-${t.id}"></div>
        <div class="task-detail-row">
          <label>${ic('box', 16)} Mover a <select class="form-select" data-moveto="${t.id}">
            ${lists.map(l=>`<option value="${l.id}" ${t.list===l.id?'selected':''}>${esc(l.icon || '')} ${esc(l.name)}</option>`).join('')}
          </select></label>
        </div>
        <div class="task-detail-row">
          <input class="form-input" data-tags="${t.id}" value="${(t.tags||[]).join(', ')}" list="tag-options" placeholder="Etiquetas, separadas por coma…">
          <button class="btn btn-primary btn-sm" data-savedetail="${t.id}">Guardar</button>
        </div>
      </div>
      <div class="task-meta">
        ${t.due?`<a href="#calendar" class="tag" title="Ver en Calendario">${t.due}${t.dueTime?' '+t.dueTime:''}</a>`:''}
        <span class="tag" id="repeattag-${t.id}" title="Días de repetición" style="${(t.repeat||[]).length?'':'display:none'}">↻ <b>${(t.repeat||[]).length}</b>d</span>
        ${(t.remindBefore??0)>0&&t.due?`<span class="tag" title="Aviso previo">aviso −${t.remindBefore}m</span>`:''}
        ${t.reminder?`<span class="tag" title="Recordatorio">${String(t.reminder).slice(0,16).replace('T',' ')}</span>`:''}
        <button class="tag" data-cycleprio="${t.id}" title="Cambiar prioridad">${prioBadge(prio)} ${PRIO_META[prio].label}</button>
        ${(t.pomo||0)>0?`<span class="tag" title="Sesiones Pomodoro dedicadas">pomodoro ×${t.pomo}</span>`:''}
        ${(t.tags||[]).map(x=>`<span class="tag">#${esc(x)}</span>`).join('')}
      </div>
    </div>
    <div class="task-icons">
      <button class="icon-btn" data-toggle="${t.id}" title="Programar: fecha, hora, repetición" aria-label="Programar">${ic('calendar')}</button>
      <button class="icon-btn ${t.reminder||t.dueTime?'on':''}" data-setreminder="${t.id}" title="Recordatorio / alarma" aria-label="Alarma">${ic('bell')}</button>
      <button class="icon-btn ${focusId===t.id?'on':''}" data-focus="${t.id}" title="Enfocar en Pomodoro" aria-label="Pomodoro">${ic('timer')}</button>
      <button class="icon-btn" data-cycleprio="${t.id}" title="Prioridad ${PRIO_META[prio].label}" aria-label="Prioridad">${ic('flag')}</button>
      ${filter==='trash' || t.deleted
        ? `<button class="icon-btn" data-restore="${t.id}" title="Restaurar" aria-label="Restaurar">${ic('restore')}</button><button class="task-del" data-permdel="${t.id}" title="Eliminar definitivo">✕</button>`
        : `<button class="task-del" data-del="${t.id}" aria-label="Eliminar">✕</button>`}
    </div>
  </article>`; };

  //  Tablero: "Todas" siempre es Kanban por listas; el resto según el toggle
  const isBoard = view.layout === 'board' || filter === 'all';
  const miniCard = t => `<div class="board-card ${t.done?'done':''}" draggable="true" data-drag="${t.id}" style="border-left:4px solid ${listColor(s, t.list)}" title="Arrastra para cambiar de lista">
    <button class="task-check ${t.done?'done':''}" data-check="${t.id}" aria-label="Completar">${t.done?'✓':''}</button>
    <div class="task-body"><div class="task-title">${esc(t.title)}</div>
    <div class="task-meta">${t.due?`<span>${t.due}${t.dueTime?' '+t.dueTime:''}</span>`:''}${prioBadge(t.priority)}${(t.repeat||[]).length?'<span title="Repetitiva">↻</span>':''}${(t.tags||[]).slice(0,2).map(x=>`<span>#${esc(x)}</span>`).join('')}</div></div>
  </div>`;
  // Tablero: con lista filtrada solo SU columna; "Todas"/"Hoy" muestran el general
  const oneList = !['all', 'today', 'trash'].includes(filter) && lists.some(l => l.id === filter)
    ? lists.filter(l => l.id === filter)
    : null;
  const boardLists = sub === 'trash' ? [{ id: '__trash', name: 'Eliminadas', color: '#C62828', icon: '' }] : (oneList || visLists);
  const boardHTML = `<div class="board">${boardLists.map(l => {
    const cards = sub === 'trash' ? boardShown : boardShown.filter(t => t.list === l.id);
    return `<div class="board-col" data-dropzone="${l.id}">
      <header style="border-top:4px solid ${l.color}"><b>${l.icon ? esc(l.icon) + ' ' : ''}${esc(l.name)}</b><span class="list-count">${cards.length}</span></header>
      <div class="board-cards">${cards.map(miniCard).join('') || '<p class="board-empty">Arrastra tareas aquí</p>'}</div>
    </div>`; }).join('')}</div>
    <p class="text-xs board-hint">Arrastra una tarjeta a otra columna para cambiarla de lista. En táctil usa el detalle y la opción Mover a.</p>`;

  // Segmentos de captura rápida: tareas SIN lista (viven en Bandeja con preset de fecha)
  const segToday = alive.filter(t => !t.done && t.due === todayISO()).length;
  const segWeek = alive.filter(t => !t.done && t.due && t.due > todayISO() && t.due <= addDaysISO(todayISO(), 7)).length;
  const segInbox = alive.filter(t => !t.done && t.list === 'inbox').length;

  return `<section class="page" aria-label="Tareas y listas">
    <datalist id="tag-options">${(s.tags||[]).map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
    <datalist id="emoji-options">${LIST_EMOJIS.map(e=>`<option value="${e}">`).join('')}</datalist>
    <div class="page-head"><div><p>${open.length} pendientes • ${doneT.length} completadas • ${trash.length} eliminadas</p></div>
    <div class="page-actions"><button class="btn btn-primary" data-act="quick-add">+ Nueva tarea</button></div></div>
    <div class="segments" role="group" aria-label="Captura rápida sin lista">
      <div class="card segment-card"><span class="segment-icon">${ic('calendar', 22)}</span><div><b>Hoy</b><small>Vence hoy • ${segToday}</small></div><button class="btn btn-secondary btn-sm" data-segadd="today">+ Nueva</button></div>
      <div class="card segment-card"><span class="segment-icon">${ic('calendar', 22)}</span><div><b>Semana</b><small>Próximos 7 días • ${segWeek}</small></div><button class="btn btn-secondary btn-sm" data-segadd="week">+ Nueva</button></div>
      <div class="card segment-card"><span class="segment-icon">${ic('inbox', 22)}</span><div><b>Buzón de entrada</b><small>Sin fecha • ${segInbox}</small></div><button class="btn btn-secondary btn-sm" data-segadd="inbox">+ Nueva</button></div>
    </div>
    <div class="tasks-layout">
      <aside class="card lists-panel">
        <div class="panel-sec">
          <div class="panel-sec-head"><span class="panel-sec-icon">${ic('list', 16)}</span><h3>Listas <span class="panel-count">(${lists.length})</span></h3>
            <span class="menu-wrap"><button class="icon-btn sm" data-act="lists-menu" title="Opciones de listas">${ic('gear', 15)}</button>
              <span class="menu-dropdown hidden" id="lists-menu">
                <button data-act="sort-lists-az">Ordenar A–Z ${view.listSort ? '✓' : ''}</button>
                <button data-act="hide-empty-lists">${view.hideEmpty ? 'Mostrar vacías' : 'Ocultar vacías'}</button>
                <button data-act="empty-trash">Vaciar papelera</button>
              </span></span>
            <button class="icon-btn sm" data-act="open-list-modal" title="Nueva lista">${ic('plus', 15)}</button></div>
          <button class="list-item ${filter==='all'?'active':''}" data-list="all" title="${alive.filter(t=>!t.done).length} pendientes de ${alive.length} en total"><span class="list-emoji" aria-hidden="true">${ic('board', 15)}</span> Todas <span class="list-count">${alive.filter(t => !t.done).length}</span></button>
          <button class="list-item ${filter==='today'?'active':''}" data-list="today" title="Pendientes que vencen hoy"><span class="list-emoji" aria-hidden="true">${ic('calendar', 15)}</span> Hoy <span class="list-count">${alive.filter(t=>t.due===todayISO()&&!t.done).length}</span></button>
          ${visLists.map(l=>{ const lt = alive.filter(t=>t.list===l.id); const lo = lt.filter(t=>!t.done).length; return `<div class="list-row ${filter===l.id?'active':''}"><button class="list-item" data-list="${l.id}" style="flex:1;min-width:0" title="${escA(l.description) || 'Sin descripción'} • ${lo} pendientes • ${lt.length-lo} hechas"><span class="list-emoji" aria-hidden="true">${esc(l.icon || '📋')}</span><span class="list-dot" style="background:${l.color}"></span> ${esc(l.name)} <span class="list-count">${lo}</span></button><button class="icon-btn sm" data-listedit="${l.id}" title="Configurar lista (nombre, color, emoji)">${ic('gear', 14)}</button></div>`; }).join('')}
          <button class="list-item ${filter==='trash'?'active':''}" data-list="trash"><span class="list-emoji" aria-hidden="true">${ic('trash', 15)}</span> Eliminadas <span class="list-count">${trash.length}</span></button>
        </div>
        <div class="panel-sec">
          <div class="panel-sec-head"><span class="panel-sec-icon">${ic('tag', 16)}</span><h3>Etiquetas <span class="panel-count">(${(s.tags||[]).length})</span></h3>
            <span class="menu-wrap"><button class="icon-btn sm" data-act="tags-menu" title="Opciones de etiquetas">${ic('gear', 15)}</button>
              <span class="menu-dropdown hidden" id="tags-menu">
                <button data-act="sort-tags-az">Ordenar A–Z ${view.tagSort ? '✓' : ''}</button>
                <button data-act="clean-tags">Eliminar sin uso</button>
              </span></span>
            <button class="icon-btn sm" data-act="open-tag-modal" title="Nueva etiqueta">${ic('plus', 15)}</button></div>
          <div class="tag-list">${visTags.map(t=>`<div class="tag-row" id="tagrow-${esc(t)}"><span class="tag">#${esc(t)}</span><span class="tag-tools"><button class="icon-btn sm" data-tagedit="${esc(t)}" title="Renombrar">${ic('pencil', 14)}</button><button class="task-del sm" data-tagdel="${esc(t)}" title="Eliminar">✕</button></span></div>`).join('') || '<p class="text-xs" style="color:var(--text-tertiary);padding:0 8px">Sin etiquetas.</p>'}</div>
        </div>
      </aside>
      <div class="card">
        ${filter!=='trash' ? `<form id="inline-add" class="task-input-row"><input class="form-input" id="inline-title" placeholder="+ Añadir tarea a ${filter}, pulsa Enter…" autocomplete="off"><button class="btn btn-primary">Añadir</button></form>` : ''}
        <div class="filter-bar" role="group" aria-label="Filtros de tareas">
          <span class="filter-label">Filtrar:</span>
          <button class="chip ${view.layout!=='board'?'active':''}" data-layout="list" title="Vista de lista">Lista</button>
          <button class="chip ${view.layout==='board'?'active':''}" data-layout="board" title="Tablero por listas: arrastra tareas entre columnas">Tablero</button>
          <select id="f-prio" class="form-select" title="Filtrar por prioridad">
            <option value="all">Todas</option>
            ${Object.entries(PRIO_META).map(([v,m])=>`<option value="${v}" ${view.prio===v?'selected':''}>${m.label}</option>`).join('')}
          </select>
          <select id="f-tag" class="form-select" title="Filtrar por etiqueta">
            <option value="all"># Todas</option>
            ${(s.tags||[]).map(t=>`<option value="${esc(t)}" ${view.tag===t?'selected':''}>#${esc(t)}</option>`).join('')}
          </select>
          <select id="f-sort" class="form-select" title="Ordenar">
            <option value="manual" ${view.sort==='manual'?'selected':''}>Manual</option>
            <option value="due" ${view.sort==='due'?'selected':''}>Por fecha</option>
            <option value="prio" ${view.sort==='prio'?'selected':''}>Por prioridad</option>
            <option value="title" ${view.sort==='title'?'selected':''}>A–Z</option>
          </select>
          <button class="chip" data-act="clear-filters" title="Limpiar filtros">${ic('xcirc', 13)} Limpiar</button>
        </div>
        ${filter!=='trash' ? `<div class="sub-tabs"><button class="${sub==='open'?'active':''}" data-sub="open">Pendientes (${open.length})</button><button class="${sub==='done'?'active':''}" data-sub="done">Completadas (${doneT.length})</button><button class="${sub==='trash'?'active':''}" data-sub="trash">Eliminadas (${trash.length})</button></div>` : `<h4 class="task-group-title">Eliminadas (${trash.length})</h4>`}
        ${isBoard ? boardHTML : `<div class="task-list">${shown.map(taskRow).join('') || '<p class="text-secondary text-sm" style="padding:8px">Nada por aquí.</p>'}</div>`}
        ${(filter==='trash'||sub==='trash')&&trash.length ? `<div class="form-actions" style="margin:0 12px 12px"><button class="btn btn-danger btn-sm" data-act="empty-trash">Vaciar papelera</button></div>`:''}
      </div>
    </div></section>`;
}

/* ---------- 2. CALENDARIO (Año / Mes / Semana / Día / multi) ---------- */
const CAL_MODES = [['year', 'Año'], ['month', 'Mes'], ['week', 'Semana'], ['day', 'Día'], ['mdays', '3 días'], ['mweeks', '2 sem.']];
const WD_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export function CalendarPage(s, view = { offset: 0, list: 'all', onlyTime: false, mode: 'month' }) {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const mode = view.mode || 'month';
  const off = view.offset || 0;
  const todayStr = todayISO();
  const inFilter = t => (view.list === 'all' || t.list === view.list) && (!view.onlyTime || !!t.dueTime);
  const dayEvents = iso => s.tasks.filter(t => !t.deleted && !t.done && occursOn(t, iso) && inFilter(t)).sort((a, b) => (a.dueTime || '99') < (b.dueTime || '99') ? -1 : 1);
  const evDiv = e => {
    const c = listColor(s, e.list);
    return `<div class="cal-ev" style="border-left-color:${c}" title="${esc(e.title)}${e.dueTime ? ' ' + e.dueTime : ''}">${e.dueTime ? `<b>${e.dueTime}</b> ` : ''}${esc(e.title).slice(0, 20)}${(e.repeat || []).length ? ' ↻' : ''}</div>`;
  };
  // Píldora delgada solo para el Mes: punto + hora + título corto (el detalle vive en Semana/Día)
  const evSlim = e => {
    const c = listColor(s, e.list);
    return `<div class="cal-ev slim" style="border-left-color:${c}" title="${esc(e.title)}${e.dueTime ? ' ' + e.dueTime : ''}${(e.repeat || []).length ? ' (repite)' : ''}"><i style="background:${c}"></i>${e.dueTime ? `<b>${e.dueTime}</b>` : ''}<span>${esc(e.title).slice(0, 12)}${(e.repeat || []).length ? ' ↻' : ''}</span></div>`;
  };
  const agendaItem = e => {
    const c = listColor(s, e.list);
    const li = s.lists.find(l => l.id === e.list);
    return `<div class="agenda-item" style="border-left-color:${c}"><span>${e.dueTime || 'Todo el día'}</span>${prioBadge(e.priority)}<span>${esc(e.title)}</span><span class="tag">${li ? esc(li.icon || '') + ' ' : ''}${esc(li?.name || e.list)}</span></div>`;
  };
  const switcher = `<div class="view-switch" role="tablist" aria-label="Vista de calendario">${CAL_MODES.map(([v, l]) => `<button role="tab" class="${mode === v ? 'active' : ''}" data-calview="${v}">${l}</button>`).join('')}</div>`;

  let title = '', body = '';
  if (mode === 'year') {
    const yy = new Date().getFullYear() + off;
    title = `${yy}`;
    body = `<div class="year-grid">${Array.from({ length: 12 }, (_, m) => {
      const first = new Date(yy, m, 1), sd = (first.getDay() + 6) % 7, nd = new Date(yy, m + 1, 0).getDate();
      let g = '';
      for (let i = 0; i < sd; i++) g += '<span></span>';
      for (let d = 1; d <= nd; d++) {
        const iso = `${yy}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        g += `<span class="${dayEvents(iso).length ? 'has-ev' : ''}${iso === todayStr ? ' is-today' : ''}">${d}</span>`;
      }
      return `<button class="mini-month" data-calmonth="${yy}-${String(m + 1).padStart(2, '0')}"><b>${new Date(yy, m, 1).toLocaleDateString('es', { month: 'long' })}</b><div class="mini-grid">${g}</div></button>`;
    }).join('')}</div>`;
  } else if (mode === 'month') {
    const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off);
    const y = base.getFullYear(), m = base.getMonth();
    const sd = (new Date(y, m, 1).getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate();
    title = new Date(y, m, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
    let cells = '';
    ['L', 'M', 'X', 'J', 'V', 'S', 'D'].forEach(d => cells += `<div class="cal-dow">${d}</div>`);
    for (let i = 0; i < sd; i++) cells += `<div class="cal-day other"></div>`;
    for (let d = 1; d <= nd; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evs = dayEvents(iso);
      cells += `<div class="cal-day ${iso === todayStr ? 'today' : ''}"><div class="cal-num">${d}</div>${evs.slice(0, 2).map(evSlim).join('')}${evs.length > 2 ? `<button class="cal-more" data-expandday="${iso}">+${evs.length - 2} más</button><div class="cal-extra hidden">${evs.slice(2).map(evSlim).join('')}</div>` : ''}</div>`;
    }
    body = `<div class="calendar-grid">${cells}</div>`;
  } else {
    // week / day / mdays / mweeks: columnas de días
    const weekMon = addDaysISO(mondayOfWeekKey(isoWeekKey(new Date())), 0);
    let isos = [];
    if (mode === 'week') isos = Array.from({ length: 7 }, (_, i) => addDaysISO(weekMon, off * 7 + i));
    else if (mode === 'day') isos = [addDaysISO(todayStr, off)];
    else if (mode === 'mdays') { const st = addDaysISO(todayStr, off * 3); isos = [st, addDaysISO(st, 1), addDaysISO(st, 2)]; }
    else { const st = addDaysISO(weekMon, off * 14); isos = Array.from({ length: 14 }, (_, i) => addDaysISO(st, i)); }
    const fmtD = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }); };
    title = isos.length === 1
      ? new Date(...isos[0].split('-').map((n, i) => i === 1 ? +n - 1 : +n)).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
      : `${fmtD(isos[0])} — ${fmtD(isos[isos.length - 1])}`;
    if (mode === 'day') {
      const evs = dayEvents(isos[0]);
      const allDay = evs.filter(e => !e.dueTime);
      const byHour = {};
      evs.filter(e => e.dueTime).forEach(e => { (byHour[e.dueTime.slice(0, 2)] ||= []).push(e); });
      body = `<div class="day-hours">
        <div class="day-hour"><b>Todo el día</b><div class="hour-items">${allDay.map(agendaItem).join('') || '<span class="text-secondary text-sm">—</span>'}</div></div>
        ${Object.keys(byHour).sort().map(h => `<div class="day-hour"><b>${h}:00</b><div class="hour-items">${byHour[h].map(agendaItem).join('')}</div></div>`).join('')}
      </div>`;
    } else {
      body = `<div class="week-grid${isos.length === 3 ? ' cols-3' : ''}">${isos.map(iso => {
        const dt = new Date(...iso.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
        const evs = dayEvents(iso);
        return `<div class="week-col ${iso === todayStr ? 'today' : ''}"><header><b>${WD_SHORT[(dt.getDay() + 6) % 7]}</b><span>${dt.getDate()}</span></header><div class="board-cards">${evs.map(evDiv).join('') || '<p class="board-empty">—</p>'}</div></div>`;
      }).join('')}</div>`;
    }
  }

  // Agenda 7 días (respeta los filtros)
  let agenda = '';
  for (let i = 0; i < 7; i++) {
    const iso = addDaysISO(todayStr, i);
    const evs = dayEvents(iso);
    if (!evs.length && i > 0) continue;
    agenda += `<div class="agenda-day"><b>${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : iso}</b>${evs.map(agendaItem).join('') || '<span class="text-secondary text-sm">Sin tareas — agenda libre</span>'}</div>`;
  }

  return `<section class="page" aria-label="Calendario"><div class="page-head"><div><p><span class="cal-month">${title}</span><br><span class="text-sm" style="color:var(--text-tertiary)">Cada lista pinta con su color • ↻ = repetitiva</span></p></div>
  <div class="page-actions"><button class="btn btn-secondary" data-calnav="-1">←</button><button class="btn btn-secondary" data-calnav="0">Hoy</button><button class="btn btn-secondary" data-calnav="1">→</button><a class="btn btn-secondary" href="#tasks">+ Programar</a></div></div>
  ${switcher}
  <div class="filter-bar" role="group" aria-label="Filtros de calendario">
    <span class="filter-label">Ver:</span>
    <select id="cal-list" class="form-select"><option value="all">Todas las listas</option>${s.lists.map(l => `<option value="${l.id}" ${view.list === l.id ? 'selected' : ''}>${esc(l.icon || '')} ${esc(l.name)}</option>`).join('')}</select>
    <label class="check-label"><input type="checkbox" id="cal-time" ${view.onlyTime ? 'checked' : ''}> Solo con hora</label>
    <button class="chip" data-act="clear-cal" title="Limpiar filtros">${ic('xcirc', 13)} Limpiar</button>
  </div>
  <div class="cal-legend">${s.lists.map(l => `<span class="legend-item"><i style="background:${l.color}"></i>${esc(l.icon || '')}${esc(l.name)}</span>`).join('')}</div>
  ${body}
  <h3 style="margin:16px 0 8px">Agenda — próximos 7 días</h3>
  <div class="card card-pad agenda">${agenda}</div></section>`;
}

/* ---------- 3. POMODORO ---------- */
export function PomodoroPage(s) {
  let focus = null;
  try { focus = JSON.parse(localStorage.getItem('creeky_focus') || 'null'); } catch {}
  if (typeof focus === 'string') focus = { id: null, title: focus };
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const ft = focus?.id ? (s.tasks || []).find(t => t.id === focus.id) : null;
  const fli = ft ? s.lists.find(l => l.id === ft.list) : null;
const focusCard = focus ? `<div class="focus-card">
      <div class="focus-info" style="flex:1;min-width:0"><b class="focus-title">Enfocando: ${esc(ft?.title || focus.title)}</b>
        ${ft
          ? `<div class="focus-meta">${fli ? esc(fli.icon || '') + ' ' + esc(fli.name) + ' • ' : ''}${ft.due ? 'vence ' + ft.due + (ft.dueTime ? ' ' + ft.dueTime : '') + ' • ' : ''}${ft.duration || 30} min • sesiones dedicadas: ${ft.pomo || 0}</div>`
          : `<div class="focus-meta" style="color:var(--text-tertiary)">La tarea ya no existe</div>`}
      </div>
      <div class="focus-actions" style="display:flex;gap:6px;flex-shrink:0">${ft && !ft.done ? `<button class="btn btn-primary btn-sm" data-act="focus-done">Completar tarea</button>` : ''}<button class="btn btn-secondary btn-sm" data-act="unfocus">Quitar</button></div>
    </div>` : '';
  const log = (s.pomoLog || []).slice(0, 30);
  const todayCount = (s.pomoLog || []).filter(p => p.date === todayISO() && p.mode === 'focus').length;
  const totalMin = (s.pomoLog || []).filter(p => p.mode === 'focus').reduce((a,p) => a + (+p.minutes || 0), 0);
  // Tareas con sesión Pomodoro reservada (del día): todas las que tienen bloques y no están hechas/borradas
  const pomoTasks = (s.tasks || []).filter(t => !t.deleted && !t.done && Array.isArray(t.pomodoroBlocks) && t.pomodoroBlocks.length > 0);
  const pomoToday = pomoTasks.filter(t => !t.due || t.due === todayISO() || occursOn(t, todayISO()));
  const pomoOthers = pomoTasks.filter(t => !pomoToday.includes(t));
  const renderPomoCard = (t) => {
    const li = s.lists.find(l => l.id === t.list);
    const blocks = t.pomodoroBlocks || [];
    const f = blocks.filter(b=>b.type==='focus').length;
    const mins = blocks.reduce((a,b)=>a+b.duration,0);
    const isFocused = focus?.id === t.id;
    const timeLabel = t.dueTime ? esc(t.dueTime) : '';
    return `<div class="card pomo-task-card ${isFocused?'active':''}" data-pomofocus="${t.id}" style="--pomo-accent:${listColor(s,t.list)}">
      <div class="pomo-card-main">
        <div class="pomo-card-title" title="${esc(t.title)}">${esc(t.title)}</div>
        <div class="pomo-card-meta">${li ? `<span class="pomo-card-list">${esc(li.icon||'•')} ${esc(li.name)}</span><span class="pomo-sep">·</span>` : ''}<span>${f}×25 · ${mins}′</span>${timeLabel ? `<span class="pomo-sep">·</span><span>${timeLabel}</span>` : ''}</div>
        <div class="pomo-card-dots" aria-hidden="true">${blocks.map(b=> `<i class="pomo-dot ${b.type==='focus'?'focus':b.type==='longBreak'?'long':''}" title="${b.duration}′"></i>`).join('')}</div>
      </div>
      ${!isFocused ? `<button class="pomo-card-action" data-pomofocus="${t.id}" aria-label="Enfocar ${esc(t.title)}">Enfocar</button>` : `<span class="pomo-card-badge">Enfocada</span>`}
    </div>`;
  };
return `<section class="page" aria-label="Pomodoro"><div class="page-head"><div><p>Técnica 25 / 5 • distintivo Creeky: anillo de calma monocromo</p></div></div>
  <div class="card pomo-wrap">
    <div class="pomo-modes"><button class="mode-btn active" data-mode="25">Foco 25</button><button class="mode-btn" data-mode="5">Descanso 5</button><button class="mode-btn" data-mode="15">Largo 15</button></div>
    <div class="pomo-ring work" id="pomo-ring"><div class="pomo-time" id="pomo-time">25:00</div><div class="pomo-label" id="pomo-label">Listo para enfocar</div></div>
    <div class="pomo-controls"><button class="btn btn-primary btn-lg" id="pomo-start">Iniciar</button><button class="btn btn-secondary" id="pomo-reset">Reiniciar</button></div>
    <div class="pomo-stats"><span>Foco hoy: <b>${todayCount}</b></span><span>•</span><span>Minutos totales: <b>${totalMin}</b></span></div>
  </div>
  ${focusCard}
  <h3 style="margin:16px 0 8px">Historial de sesiones</h3>
  <div class="card card-pad">
    <div class="filter-bar" style="padding:0 0 12px" role="group" aria-label="Filtros de historial">
      <span class="filter-label">Ver:</span>
      <button class="chip active" data-plog-range="all">Todo</button>
      <button class="chip" data-plog-range="today">Hoy</button>
      <button class="chip" data-plog-range="week">7 días</button>
      <span class="filter-label">Tipo:</span>
      <button class="chip active" data-plog-mode="all">Todos</button>
      <button class="chip" data-plog-mode="focus">Foco</button>
      <button class="chip" data-plog-mode="break">Descanso</button>
    </div>
    <div id="plog-list" class="search-results">${log.map(p=>`<div class="card result-item plog-row" data-date="${p.date}" data-mode="${p.mode}"><span class="plog-dot ${p.mode}"></span><div><b>${p.minutes} min — ${p.mode==='focus'?'Foco':'Descanso'}</b><div class="text-sm" style="color:var(--text-tertiary)">${p.date}${p.task?' • '+esc(p.task):''}</div></div></div>`).join('') || '<p class="text-secondary">Sin sesiones aún. Completa tu primer pomodoro.</p>'}</div>
  </div>
  ${pomoTasks.length > 0 ? `<h3 style="margin:24px 0 8px">Sesiones Pomodoro del día <span class="text-xs" style="font-weight:400;color:var(--text-tertiary)">(${pomoToday.length} hoy • ${pomoTasks.length} total)</span></h3>
  <div class="card card-pad" style="margin-bottom:16px">
    <div class="filter-bar" style="padding:0 0 10px">
      <span class="filter-label">Ver:</span>
      <button class="chip active" data-pomoday="today">Hoy (${pomoToday.length})</button>
      <button class="chip" data-pomoday="all">Todas (${pomoTasks.length})</button>
    </div>
    <div id="pomo-day-list" class="pomo-day-grid">
      ${pomoToday.length ? pomoToday.map(renderPomoCard).join('') : `<p class="text-sm" style="color:var(--text-tertiary);text-align:center;padding:12px">No hay tareas con Pomodoro para hoy. Crea una tarea y marca "Reservar Pomodoro".</p>`}
    </div>
    <div id="pomo-all-list" class="pomo-day-grid hidden">
      ${pomoTasks.length ? pomoTasks.map(renderPomoCard).join('') : `<p class="text-sm" style="color:var(--text-tertiary);text-align:center;padding:12px">Aún no has reservado Pomodoros.</p>`}
    </div>
  </div>` : ''}
</section>`;
}
export function mountPomodoro(root) {
  let total = 25*60, left = total, timer=null, modeMin = 25;
  const timeEl = root.querySelector('#pomo-time'), label = root.querySelector('#pomo-label');
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const draw = () => { timeEl.textContent = fmt(left); };
  root.querySelectorAll('.mode-btn').forEach(b=>b.onclick=()=>{ root.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); modeMin=+b.dataset.mode; total=left=modeMin*60; clearInterval(timer); timer=null; root.querySelector('#pomo-start').textContent='Iniciar'; label.textContent='Listo'; draw(); });
  root.querySelector('#pomo-reset').onclick=()=>{ left=total; clearInterval(timer); timer=null; root.querySelector('#pomo-start').textContent='Iniciar'; draw(); };
  root.querySelector('#pomo-start').onclick=(e)=>{
    if(timer){clearInterval(timer);timer=null;e.target.textContent='Continuar';label.textContent='En pausa';return;}
    e.target.textContent='Pausar'; label.textContent='Enfocando…';
    timer=setInterval(()=>{
      left--; draw();
      if(left<=0){
        clearInterval(timer);timer=null;label.textContent='¡Sesión completa!';e.target.textContent='Iniciar';left=total;
        try{
          const s = db.load();
          let task = null; try { task = JSON.parse(localStorage.getItem('creeky_focus') || 'null'); } catch {}
          if (typeof task === 'string') task = { id: null, title: task };
          const taskTitle = task?.title || null;
          s.pomoLog.unshift({ id: uid('p'), date: todayISO(), ts: Date.now(), mode: modeMin === 25 ? 'focus' : 'break', minutes: modeMin, task: taskTitle });
          if (modeMin === 25 && task?.id) {
            const t = s.tasks.find(x => x.id === task.id && !x.deleted);
            if (t) {
              t.pomo = (t.pomo || 0) + 1;
              s.notifications.unshift({ id: uid('n'), title: 'Sesión dedicada', text: `"${t.title}" suma ${t.pomo} sesión(es) Pomodoro.`, time: new Date().toLocaleString(), unread: true, kind: 'system' });
            }
          }
          db.save(s);
        }catch{}
        try{new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=').play();}catch{}
        draw();
      }
    },1000);
  };
  draw();
}

/* ---------- 4. MATRIZ EISENHOWER (Kanban sincronizado con prioridad) ---------- */
export function EisenhowerPage(s, view = { list: 'all' }) {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const alive = (s.tasks || []).filter(t => !t.deleted && !t.done);
  // Sincronía total: Q1=alta, Q2=media, Q3=baja, Q4=ninguna
  const effQ = t => ({ high: 'q1', medium: 'q2', low: 'q3' }[(t.priority || 'none')] || 'q4');
  const inList = t => view.list === 'all' || t.list === view.list;
  const auto = {
    q1: alive.filter(t => effQ(t) === 'q1' && inList(t)),
    q2: alive.filter(t => effQ(t) === 'q2' && inList(t)),
    q3: alive.filter(t => effQ(t) === 'q3' && inList(t)),
    q4: alive.filter(t => effQ(t) === 'q4' && inList(t)),
  };
  const QP = { q1: 'high', q2: 'medium', q3: 'low', q4: 'none' };
  const q = (id, title, desc) => {
    const manual = (view.list === 'all' ? (s.matrix[id] || []) : []);
    const at = auto[id] || [];
    return `<div class="card quadrant ${id}" data-qdrop="${id}"><header><span class="q-badge">${id.toUpperCase()}</span><div><b>${title}</b><small>${desc} • ${at.length + manual.length}</small></div><span style="margin-left:auto">${prioBadge(QP[id])}</span></header>
    <div class="q-list">${manual.map((t, i) => `<div class="task-item q-item" draggable="true" data-qnotedrag="${id}:${i}"><div class="task-body"><div class="task-title"><span class="tag">Manual</span> ${esc(t)}</div></div><button class="task-del" data-qdel="${id}:${i}">✕</button></div>`).join('')}
    ${at.map(t => { const li = s.lists.find(l => l.id === t.list); const ln = esc(li?.name || t.list); return `<div class="task-item q-item" draggable="true" data-qdrag="${t.id}" title="Arrastra a otro cuadrante para cambiar su prioridad • ${ln} • ${t.due || 'sin fecha'}"><button class="task-check" data-check="${t.id}" aria-label="Completar"></button><div class="task-body"><div class="task-title">${esc(t.title)}</div><div class="task-meta"><span>${li ? esc(li.icon || '') + ' ' : ''}${ln}</span>${t.due ? `<span>${t.due}</span>` : ''}</div></div></div>`; }).join('')}
    ${!manual.length && !at.length ? '<p class="text-secondary text-sm q-empty" style="padding:4px 8px">Suelta tareas aquí</p>' : ''}</div>
    <form class="q-add" data-q="${id}"><input class="form-input" placeholder="Añadir nota a ${title}…"><button class="btn btn-secondary">+</button></form></div>`;
  };
  return `<section class="page" aria-label="Matriz Eisenhower"><div class="page-head"><div><p>Tablero Kanban sincronizado con la prioridad: Q1 alta • Q2 media • Q3 baja • Q4 ninguna. Arrastra para cambiarla.</p></div><div class="page-actions"><button class="btn btn-primary" data-act="auto-matrix">${ic('zap', 15)} Copiar auto a manual</button></div></div>
  <div class="filter-bar" role="group" aria-label="Filtros de matriz">
    <span class="filter-label">Filtrar:</span>
    <input class="form-input" id="matrix-filter" placeholder="Texto…" style="max-width:200px">
    <select id="matrix-list" class="form-select"><option value="all">Todas las listas</option>${s.lists.map(l => `<option value="${l.id}" ${view.list === l.id ? 'selected' : ''}>${esc(l.icon || '')} ${esc(l.name)}</option>`).join('')}</select>
    <button class="chip" data-act="clear-matrix" title="Limpiar filtros">${ic('xcirc', 13)} Limpiar</button>
  </div>
  <div class="matrix">${q('q1', 'Hacer primero', 'Prioridad ¡Alta!')}${q('q2', 'Planificar', 'Prioridad ¡Media!')}${q('q3', 'Delegar', 'Prioridad ¡Baja!')}${q('q4', 'Eliminar', 'Sin prioridad')}</div></section>`;
}

/* ---------- 5. HÁBITOS (racha persistente + recordatorio diario) ---------- */
export function HabitsPage(s) {
  const cols = ['L','M','X','J','V','S','D'];
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const monthPrefix = todayISO().slice(0, 7);
  const monthChecks = (s.habits || []).reduce((a, h) => a + Object.keys(h.history || {}).filter(k => k.startsWith(monthPrefix)).length + (h.days || []).filter(Boolean).length, 0);
  const activeR = (s.habits || []).filter(h => (h.streak || 0) > 0).length;
  const bestAll = Math.max(0, ...(s.habits || []).map(h => h.best || 0));
  // Semana visible que estás llenando (lunes → domingo) + días futuros bloqueados
  const monday = mondayOfWeekKey(isoWeekKey(new Date()));
  const sunday = addDaysISO(monday, 6);
  const fmtR = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' }); };
  const todayStr = todayISO();
  return `<section class="page" aria-label="Hábitos"><div class="page-head"><div><p>Marca cada día. Al cambiar de semana se archiva sola y la racha continúa.</p></div>
  <div class="page-actions"><form id="habit-add" style="display:flex;gap:8px"><input class="form-input" id="habit-name" placeholder="Nuevo hábito…"><button class="btn btn-primary">+</button></form></div></div>
  <div class="card card-pad habit-summary"><span>Rachas activas <b>${activeR}</b></span><span>Checks este mes <b>${monthChecks}</b></span><span>Mejor racha <b>${bestAll}</b></span><span class="text-xs" style="color:var(--text-tertiary)">Semana del ${fmtR(monday)} al ${fmtR(sunday)}</span></div>
  <p class="text-sm habit-explain">La racha cuenta días consecutivos hasta hoy (los futuros no suman y están bloqueados). Cada lunes la semana se archiva y los checks se reinician <b>sin perder la racha</b> mientras no falles un día.</p>
  <div class="filter-bar" role="group" aria-label="Filtros de hábitos" style="padding:12px 0">
    <span class="filter-label">Ver:</span>
    <button class="chip active" data-hfilter="all">Todos (${s.habits.length})</button>
    <button class="chip" data-hfilter="active">Activos</button>
    <button class="chip" data-hfilter="hot">Racha ≥ 5</button>
    <button class="chip" data-hfilter="fresh">Sin empezar</button>
  </div>
  <div class="card card-pad habits-table-wrap"><table class="habits-table"><thead><tr><th>Hábito</th>${cols.map((c, i) => { const iso = addDaysISO(monday, i); return `<th title="${iso}">${c}<br><small>${+iso.slice(8)}</small></th>`; }).join('')}<th>Racha</th><th></th></tr></thead><tbody>
  ${s.habits.map(h=>`<tr class="habit-row" data-streak="${h.streak||0}"><td><span class="habit-name" id="habitname-${h.id}">${esc(h.name)}</span><br><span class="habit-sub"><button class="icon-btn sm ${h.notify ? 'on' : ''}" data-hnotify="${h.id}" title="Recordatorio diario">${ic('bell', 13)}</button><input type="time" class="habit-time" data-htime="${h.id}" value="${h.notifyTime || '09:00'}" title="Hora del recordatorio"></span></td>${h.days.map((d,i)=>{ const iso = addDaysISO(monday, i); const future = iso > todayStr; return `<td><button class="habit-check ${d?'on':''}" data-h="${h.id}:${i}" ${future ? 'disabled title="Este día aún no llega"' : `title="Marcar ${iso}"`}>${d?'✓':''}</button></td>`; }).join('')}<td><span class="streak" title="Mejor racha: ${h.best || 0} • La racha cuenta días consecutivos hasta hoy">${ic('zap', 14)} ${h.streak}</span><div class="best">mejor ${h.best || 0}</div></td><td style="white-space:nowrap"><button class="icon-btn" data-hedit="${h.id}" title="Editar nombre">${ic('pencil', 14)}</button><button class="task-del" data-hdel="${h.id}" title="Eliminar">✕</button></td></tr>`).join('')}
  </tbody></table></div></section>`;
}

/* ---------- 6. CUENTA REGRESIVA (manual + auto desde tareas) ---------- */
export function CountdownPage(s, view='upcoming') {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  // Partes exactas hasta un fin (ms): días + horas + minutos (para el mismo día)
  const parts = endMs => {
    const ms = endMs - Date.now();
    if (!(ms > 0)) return { over: true, d: 0, h: 0, m: 0 };
    return { over: false, d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4) };
  };
  const nums = p => p.over
    ? `<div class="count-nums"><div class="count-num"><b>0</b><span>vencida</span></div></div>`
    : p.d > 0
      ? `<div class="count-nums"><div class="count-num"><b>${p.d}</b><span>días</span></div><div class="count-num"><b>${p.h}</b><span>horas</span></div></div>`
      : `<div class="count-nums"><div class="count-num"><b>${p.h}</b><span>horas</span></div><div class="count-num"><b>${p.m}</b><span>min</span></div></div>`;
  const card = c => {
    const p = parts(new Date(`${c.date}T23:59:00`).getTime());
    const total = Math.max(1, Math.ceil((new Date(c.date) - c.created) / 864e5));
    const done = Math.max(0, Math.min(1, 1 - (new Date(`${c.date}T23:59:00`).getTime() - Date.now()) / (total * 864e5)));
    return `<div class="card count-card"><h4>${esc(c.title)}</h4><div class="count-date">Meta: ${c.date}</div>
    <div id="cview-${c.id}">
      ${nums(p)}
      <div class="count-progress"><i style="width:${Math.round(done * 100)}%"></i></div>
    </div>
    <div id="cedit-${c.id}" class="hidden" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
      <input class="form-input" data-ctitle="${c.id}" value="${esc(c.title)}">
      <input class="form-input" data-cdate="${c.id}" type="date" value="${c.date}">
      <button class="btn btn-primary btn-sm" data-ceditsave="${c.id}">Guardar</button>
    </div>
    <button class="icon-btn" data-cedit="${c.id}" title="Editar" style="position:absolute;top:8px;left:8px">${ic('pencil', 15)}</button>
    <button class="task-del" data-cdel="${c.id}" style="position:absolute;top:8px;right:8px">✕</button></div>`; };
  // ⏳ Cuesta atrás automática: lo que falta para cada tarea con fecha, por lista
  const today = todayISO();
  const autoTasks = (s.tasks || []).filter(t => !t.deleted && !t.done && t.due).sort((a, b) => a.due < b.due ? -1 : 1).slice(0, 12);
  const autoCard = t => {
    const p = parts(new Date(`${t.due}T${t.dueTime || '23:59'}`).getTime());
    const start = t.createdAt || Date.now(), span = Math.max(1, new Date(`${t.due}T${t.dueTime || '23:59'}`).getTime() - start);
    const pct = Math.min(100, Math.max(0, Math.round((1 - (new Date(`${t.due}T${t.dueTime || '23:59'}`).getTime() - Date.now()) / span) * 100)));
    const c = listColor(s, t.list), li = s.lists.find(l => l.id === t.list), ln = esc(li?.name || t.list);
    return `<div class="card count-card" style="border-top:4px solid ${c}"><h4>${esc(t.title)}</h4><div class="count-date">${li ? esc(li.icon || '') + ' ' : ''}${ln} • ${t.due}${t.dueTime ? ' ' + t.dueTime : ''}</div>
    ${nums(p)}
    <div class="count-progress"><i style="width:${pct}%;background:${c}"></i></div></div>`;
  };
  return `<section class="page" aria-label="Cuenta regresiva"><div class="page-head"><div><p>Eventos que te motivan: viajes, entregas, metas.</p></div></div>
  <div class="card card-pad" style="margin-bottom:16px"><form id="count-add" class="form-row"><div class="form-group"><label class="form-label">Evento</label><input class="form-input" id="c-title" required placeholder="Ej. Lanzar Creeky"></div>
  <div class="form-group"><label class="form-label">Fecha</label><input class="form-input" id="c-date" type="date" required></div></form><div class="form-actions"><button class="btn btn-primary" form="count-add">Crear cuenta atrás</button></div></div>
  <div class="filter-bar" role="group" aria-label="Filtros de cuentas atrás" style="padding:0 0 12px">
    <span class="filter-label">Ver:</span>
    <button class="chip ${view==='upcoming'?'active':''}" data-cview="upcoming">Próximos</button>
    <button class="chip ${view==='past'?'active':''}" data-cview="past">Pasados</button>
    <button class="chip ${view==='all'?'active':''}" data-cview="all">Todos</button>
  </div>
  <div class="count-grid">${s.countdowns.filter(c=>view==='all'||(view==='past'?new Date(c.date)<new Date(todayISO()):new Date(c.date)>=new Date(todayISO()))).sort((a,b)=>a.date<b.date?-1:1).map(card).join('') || '<p class="text-secondary">Nada en esta vista.</p>'}</div>
  <h3 style="margin:20px 0 8px">Cuesta atrás automática de tus tareas</h3>
  <p class="text-sm" style="color:var(--text-tertiary);margin-bottom:8px">Cuánto falta para cada tarea con fecha, pintada con el color de su lista.</p>
  <div class="count-grid">${autoTasks.map(autoCard).join('') || '<p class="text-secondary">Pon fecha a una tarea y aparecerá aquí sola.</p>'}</div></section>`;
}

/* ---------- 7. BÚSQUEDA ---------- */
export function SearchPage(s, q='', f={list:'all',prio:'all',state:'all'}) {
  const ql = q.toLowerCase();
  let res = q ? s.tasks.filter(t=>!t.deleted && ((t.title+' '+(t.description||'')+' '+(t.tags||[]).join(' ')+' '+t.list).toLowerCase().includes(ql))) : [];
  if (f.list !== 'all') res = res.filter(t => t.list === f.list);
  if (f.prio !== 'all') res = res.filter(t => (t.priority||'none') === f.prio);
  if (f.state === 'open') res = res.filter(t => !t.done);
  if (f.state === 'done') res = res.filter(t => t.done);
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return `<section class="page" aria-label="Búsqueda"><div class="page-head"><div><p>Busca por título, descripción o etiqueta. Atajo: Ctrl + K</p></div></div>
  <div class="card card-pad"><input class="form-input" id="search-input" placeholder="Escribe para buscar…" value="${q}">
  <div class="filter-bar" role="group" aria-label="Filtros de búsqueda">
    <select id="s-list" class="form-select"><option value="all">Todas las listas</option>${s.lists.map(l=>`<option value="${l.id}" ${f.list===l.id?'selected':''}>${esc(l.icon||'')} ${esc(l.name)}</option>`).join('')}</select>
    <select id="s-prio" class="form-select"><option value="all">Todas</option>${Object.entries(PRIO_META).map(([v,m])=>`<option value="${v}" ${f.prio===v?'selected':''}>${m.label}</option>`).join('')}</select>
    <select id="s-state" class="form-select"><option value="all">Todas</option><option value="open" ${f.state==='open'?'selected':''}>Pendientes</option><option value="done" ${f.state==='done'?'selected':''}>Hechas</option></select>
  </div>
  <div class="search-results">${q ? `<p class="text-sm" style="color:var(--text-tertiary)">${res.length} resultado(s)</p>` + (res.map(t=>`<div class="card result-item"><span>${t.done?'✓':'○'}</span><div><b>${t.title}</b><div class="text-sm" style="color:var(--text-tertiary)">${esc(s.lists.find(l=>l.id===t.list)?.name||t.list)} ${t.due?'• '+t.due+(t.dueTime?' '+t.dueTime:''):''} ${(t.tags||[]).map(x=>'#'+esc(x)).join(' ')}</div>${t.description?`<div class="text-sm">${esc(t.description).slice(0,120)}</div>`:''}</div></div>`).join('') || '<p class="text-secondary">Sin resultados con esos filtros.</p>') : '<p class="text-secondary">Empieza a escribir para ver resultados en vivo.</p>'}</div></div></section>`;
}

/* ---------- 8. SINCRONIZACIÓN ---------- */
export function SyncPage(s) {
  const alive = (s.tasks || []).filter(t => !t.deleted);
  const bytes = JSON.stringify(s || {}).length;
  return `<section class="page" aria-label="Sincronización"><div class="page-head"><div><p>App personal: todo vive en tu navegador. • Código <b>v${APP_VERSION}</b></p></div><div class="page-actions"><button class="btn btn-primary" data-act="sync-now">Sincronizar ahora</button></div></div>
  <div class="card card-pad" style="margin-bottom:16px"><h3>Estado real de tus datos</h3>
    <div class="breakdown-row"><span>Listas</span><b>${(s.lists || []).length}</b></div>
    <div class="breakdown-row"><span>Tareas pendientes</span><b>${alive.filter(t => !t.done).length}</b></div>
    <div class="breakdown-row"><span>Tareas completadas</span><b>${alive.filter(t => t.done).length}</b></div>
    <div class="breakdown-row"><span>En papelera</span><b>${(s.tasks || []).filter(t => t.deleted).length}</b></div>
    <div class="breakdown-row"><span>Vencen hoy</span><b>${alive.filter(t => !t.done && occursOn(t, todayISO())).length}</b></div>
    <div class="breakdown-row"><span>Notificaciones sin leer / total</span><b>${(s.notifications || []).filter(n => n.unread).length} / ${(s.notifications || []).length}</b></div>
    <div class="breakdown-row"><span>Tamaño en localStorage</span><b>${(bytes / 1024).toFixed(1)} KB</b></div>
  </div>
  <div class="card sync-status-card"><span class="sync-dot"></span><div><b>Al día</b><div class="text-secondary text-sm">Última copia: <span id="sync-time">ahora mismo</span> • Almacenamiento: localStorage</div></div></div>
  <div class="grid-2" style="margin-top:16px"><div class="card card-pad"><h3>Exportar</h3><p class="text-secondary text-sm">Descarga tus datos en JSON. Guárdalo en Descargas o en <code>Creeky/backups/</code>.</p><div style="margin-top:10px"><button class="btn btn-secondary" data-act="export">Descargar JSON</button></div></div>
  <div class="card card-pad"><h3>Importar / Borrar</h3><p class="text-secondary text-sm">Restaura desde un <code>creeky-backup.json</code> o limpia tu espacio.</p><div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-secondary" style="cursor:pointer">Importar<input type="file" id="import-file" accept="application/json,.json" class="hidden"></label><button class="btn btn-danger" data-act="wipe">Borrar todo</button></div></div></div>
  <div class="card card-pad" style="margin-top:16px"><h3>Inspeccionar datos</h3>
    <div class="filter-bar" style="padding:12px 0"><span class="filter-label">Ver:</span>
      <select id="sync-inspect" class="form-select"><option value="tasks">Tareas</option><option value="lists">Listas</option><option value="habits">Hábitos</option><option value="countdowns">Cuentas atrás</option><option value="pomoLog">Sesiones Pomodoro</option><option value="notifications">Notificaciones</option><option value="tags">Etiquetas</option></select>
      <span class="text-sm" id="sync-count" style="color:var(--text-tertiary)"></span>
    </div>
    <pre id="sync-preview" class="data-preview">Elige una colección…</pre>
  </div></section>`;
}

/* ---------- 9. NOTIFICACIONES ---------- */
export function NotificationsPage(s, view='all') {
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const unread = s.notifications.filter(n=>n.unread).length;
  let list = s.notifications;
  if (view === 'unread') list = list.filter(n=>n.unread);
  else if (['reminder','calendar','system'].includes(view)) list = list.filter(n=>n.kind===view);
  return `<section class="page" aria-label="Notificaciones"><div class="page-head"><div><p>${unread} sin leer</p></div><div class="page-actions"><button class="btn btn-secondary" data-act="read-all">Marcar leídas</button></div></div>
  <div class="filter-bar" role="group" aria-label="Filtros de notificaciones" style="padding:0 0 12px">
    <button class="chip ${view==='all'?'active':''}" data-nview="all">Todas</button>
    <button class="chip ${view==='unread'?'active':''}" data-nview="unread">Sin leer (${unread})</button>
    <button class="chip ${view==='reminder'?'active':''}" data-nview="reminder">Alarmas</button>
    <button class="chip ${view==='calendar'?'active':''}" data-nview="calendar">Calendario</button>
    <button class="chip ${view==='system'?'active':''}" data-nview="system">Sistema</button>
  </div>
  <div class="card">${list.map(n=>`<div class="notif-item ${n.unread?'unread':''}"><div class="notif-icon">${ic(n.kind==='reminder'?'bell':n.kind==='calendar'?'calendar':'info', 18)}</div><div style="flex:1"><b>${esc(n.title)}</b><div class="text-secondary text-sm">${esc(n.text)}</div><div class="text-xs" style="color:var(--text-tertiary)">${esc(n.time)}</div></div>${n.unread?`<button class="tag" data-nread="${n.id}">Marcar leída</button>`:''}</div>`).join('') || '<p class="text-secondary" style="padding:16px">Nada en esta vista.</p>'}</div></section>`;
}

/* ---------- 10. AYUDA ---------- */
export function HelpPage() {
  const items = [['Primeros pasos','Crea listas con color y emoji, añade tareas con fecha y márcalas. Todo se guarda solo.'],['Atajos','Ctrl+K buscar • Tablero para arrastrar tareas entre listas • chips para filtrar cada sección.'],['Segmentos','Hoy, Semana y Buzón crean tareas sin lista, con fecha, hora, repetición, avisos y etiquetas.'],['Programar','En cada tarea: Hoy/Mañana/Semana, hora, duración, repetir L-D y aviso previo.'],['Choques','Dos tareas no pueden ocupar la misma franja de hora: la app bloquea y avisa.'],['Filosofía Creeky','Como un arroyo: flujo continuo, sin ruido. Monocromo salvo tus listas.'],['Privacidad','Sin cuentas reales ni nube: tus datos no salen de tu PC.'],['Colores y emojis','Cada lista tiene su color y su emoji, y pinta sus tareas en el Calendario y la agenda.'],['FAQ','¿Se borra al limpiar el navegador? Sí. Exporta tu JSON en Sincronización.']];
  return `<section class="page" aria-label="Ayuda"><div class="page-head"><div><p>Todo para dominar Creeky.</p></div></div><div class="filter-bar" role="search" style="padding:0 0 12px"><span class="filter-label">Filtrar:</span><input class="form-input" id="help-filter" placeholder="Ej. calendario, pomodoro…" style="max-width:280px"></div><div class="help-grid">${items.map(([t,d],i)=>`<div class="card help-card"><span class="help-num">${String(i+1).padStart(2,'0')}</span><h4>${t}</h4><p class="text-secondary text-sm">${d}</p></div>`).join('')}</div></section>`;
}

