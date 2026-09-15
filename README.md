# Creeky — Tu productividad organizada

Aplicación de **productividad personal** para centralizar tareas, tiempo y hábitos en un solo lugar. **Solo front-end**: HTML + CSS + JS vanilla (ES modules), sin backend, sin build ni dependencias. Todos los datos viven en `localStorage` del navegador. Versión actual: **v31**.

> Si abres con `file://` y ves pantalla en blanco o errores de `import`, es normal — los módulos ES requieren un servidor local. Ve a [Cómo abrir](#cómo-abrir--localhost).

## De qué trata y qué contiene

Creeky está pensada como **sistema operativo personal** de tu día: capturas una idea en segundos, la ubicas en una lista, le pones fecha/hora/duración, decides su prioridad y la app la proyecta automáticamente donde la necesitas — calendario, cuenta regresiva, Pomodoro y matriz de prioridad — sin duplicar datos.

**Qué contiene hoy:**
- **Gestión de tareas y listas** con prioridades, fechas, duración, repetición por días, etiquetas y descripción.
- **Planificación temporal** (Calendario + Cuenta regresiva) que nace de las mismas tareas.
- **Enfoque y ejecución** (Pomodoro 25/5/15 con reserva por franja).
- **Priorización** (Matriz Eisenhower Q1–Q4 vinculada a la prioridad).
- **Constancia** (Hábitos con racha semanal).
- **Transversal**: Búsqueda, Notificaciones y Sincronización (export/import JSON), Perfil local.

## Cómo se entrelazan las secciones

La idea clave: **una sola fuente de verdad (`tasks`) alimenta todas las vistas**. No copias la misma fecha en 3 sitios.

- **Tareas (`#tasks`) es el origen.** Cada tarea guarda `list`, `priority`, `due`/`dueTime`, `duration`, `repeat[]`, `tags`, `pomodoroBlocks[]`. Todo lo demás son proyecciones de esa colección (`src/js/store.js:2`, `KEY=creeky_db_v1`).
- **Calendario (`#calendar`) lee `tasks`.** Toda tarea con `due` aparece como pill en su día. Respeta `repeat[]` (ej. L-M-X) y `dueTime` para ubicarla a la hora. Vistas mes/semana/día/año/multi (`src/js/pages.js:CalendarPage`).
- **Cuenta regresiva (`#countdown`) lee el mismo `due`.** No creas eventos aparte: si tu tarea vence en 12 días, la tarjeta muestra `12d` y barra de progreso automáticamente.
- **Pomodoro (`#pomodoro`) reserva franjas de tareas.** Al crear una tarea puedes activar *Reservar Pomodoro* (`src/index.html:397`): la app calcula `calcPomodoroBlocks(duration)` (`src/js/main.js:24` → 25 foco / 5 descanso / 15 largo). Esa tarea aparece en *Sesiones Pomodoro del día* en `#pomodoro` y al iniciar el timer suma `pomo` a la tarea y deja traza en `pomoLog`.
- **Matriz Eisenhower (`#eisenhower`) es tu prioridad visual.** Mapeo directo `high→Q1`, `medium→Q2`, `low→Q3`, `none→Q4` (`src/js/pages.js:EisenhowerPage`). Arrastrar una tarjeta entre Q1–Q4 cambia `priority` de la tarea y viceversa.
- **Hábitos (`#habits`) es el único módulo independiente.** No usa `tasks`; es una colección `habits[]` con tabla semanal, `calcStreak()` y `mondayOfWeekKey()` (`src/js/store.js`). Sirve para medir constancia, no para planificar.
- **Búsqueda (`#search`) filtra `tasks`** por texto + lista + etiquetas. Es el atajo `Ctrl+K` para saltar a cualquier tarea.
- **Notificaciones (`#notifications`) es el bus de eventos.** Cada acción relevante empuja una notificación tipada (`reminder`/`calendar`/`system`) vía `pushNotification()` (`src/js/main.js:56`): crear tarea con fecha → `calendar`, recordatorio `remindBefore` → `reminder`, reservar Pomodoro / completar sesión → `system`. El badge cuenta `unread`.
- **Sincronización (`#sync`) persiste todo.** `db.load()`/`db.save()` + `migrate()` (`src/js/store.js:34,46`) garantizan colecciones y mueven tareas huérfanas a `inbox`. Export/Import JSON respalda `users, session, tasks, lists, tags, habits, matrix, countdowns, pomoLog, notifications`.

En resumen: **creas una vez en Tareas y la ves en Calendario, Cuenta regresiva, Pomodoro y Eisenhower sin re-escribir nada.**

## Secciones en detalle

| # | Sección | Hash | Funcionalidad |
|---|---------|------|---------------|
| 0 | **Perfil** | `#profile` | Usuario local (`auth.js`), nombre editable, stats (tareas vivas/hoy, hábitos, pomo total). |
| 1 | **Tareas / Listas** | `#tasks` | Listas con `icon` (emoji) + `color` (ej. `#3949AB`) + descripción. Tareas con prioridad `high(! roja)/medium(! amarilla)/low(! verde)/none(○)`, `due`+`dueTime`, `duration` (15–120), `repeat[]` L-D, `tags` y `description`. Vistas: lista agrupada, tablero Kanban por lista con drag & drop, segmentos Hoy/Semana/Buzón. |
| 2 | **Calendario** | `#calendar` | Render de `tasks` por `due`/`repeat`. Vistas año (mini-meses), mes (grid con pills), semana (7 columnas), día (horas), multi-mes/semana. Badge `badge-calendar` con `occursOn(today)` (`src/js/main.js:76`). |
| 3 | **Pomodoro** | `#pomodoro` | Anillo `260px` con modos 25/5/15 (`mode-btn`), timer `mm:ss`, controles Iniciar/Reiniciar. *Sesiones del día* (tarjetas compactas v31, `src/js/pages.js:381`): `64px` alto, `Título` + `emoji Lista · 2×25 · 60′ · 14:30` + puntos `6px`. Historial filtrable + `focusCard` de tarea activa. Badge `pomoReserved + pomoTodayLog` (`src/js/main.js:78`). |
| 4 | **Matriz Eisenhower** | `#eisenhower` | 4 cuadrantes autoalimentados por `priority`. Drag & drop cambia `priority`; cambiar `priority` mueve el cuadrante. Sin duplicación. |
| 5 | **Hábitos** | `#habits` | Tabla 7 días, check `habit-check.on` (`accent`), `streak`, `best streak`, campo `habit-time` para recordatorio. `rolloverHabits()` semanal. |
| 6 | **Cuenta regresiva** | `#countdown` | Tarjetas con `count-nums` (días/horas/mins), `count-progress` por `created→date`, auto-generada si la tarea tiene `due` futuro. |
| 7 | **Búsqueda** | `#search` | Input + filtros de lista/tags. Resultados `result-item` clicables que navegan a la tarea. Atajo `Ctrl+K`. |
| 8 | **Sincronización** | `#sync` | Estado `sync-dot`, `Código v31`, botones Sincronizar ahora / Descargar JSON / Importar JSON / Leer todo. |
| 9 | **Notificaciones** | `#notifications` | Lista `notif-item` con `kind` y `unread` (fondo `accent-light`), filtros `reminder/calendar/system`, "Marcar leídas". |
| 10 | **Ayuda** | `#help` | Guía numerada `help-num`, tarjetas `help-card`, historial pomodoro `plog-dot`. |

## Requisitos

- **Python 3** (para `python -m http.server`) o **Node 18+** (para `npx serve`) — cualquiera sirve. No hay `npm install`.
- Navegador moderno (Chrome / Edge / Firefox / Safari).

## Estructura

```
Creeky/
├── index.html              # redirect a src/index.html (para servir desde la raíz)
├── README.md
└── src/
    ├── index.html          # shell real: sidebar + top-bar + modales + <link rel="icon" href="data:,">
    ├── css/
    │   ├── main.css        # variables monocromas, botones, forms, modales, toasts, grid del modal
    │   ├── components.css  # sidebar, top-bar, auth, responsive (768px/1024px)
    │   └── pages.css       # estilos por sección (tasks, calendar, pomodoro, eisenhower, habits, countdown…)
    └── js/
        ├── store.js        # APP_VERSION, seed, migrate, persistencia localStorage (KEY=creeky_db_v1)
        ├── auth.js         # Sign In / Sign Up solo local
        ├── icons.js        # helper de SVGs
        ├── pages.js        # templates HTML de las 11 secciones
        └── main.js         # router por #hash, badges, modales, quick-add, timer pomodoro
```

`src/index.html` carga CSS/JS con `?v=31` para romper caché tras cada release (`src/js/store.js:3`).

## Cómo abrir — localhost

### Opción A — Recomendada (raíz, funciona siempre)

```powershell
cd "C:\Users\andri\OneDrive\Documents\Apps\Creeky"
python -m http.server 8000
# abre http://localhost:8000/   ← no https, con / al final
```

`http://localhost:8000/` sirve `Creeky/index.html` que redirige a `http://localhost:8000/src/index.html`. En consola verás `Creeky v31 tareas vivas:…`. Para detener: `Ctrl+C`.

### Opción B — Desde `src/`

```powershell
cd "C:\Users\andri\OneDrive\Documents\Apps\Creeky\src"
python -m http.server 8000
# abre http://localhost:8000/   ← ahora la raíz ya es src, no añadas /src/
```

Si abres `http://localhost:8000/src/index.html` estando ya en `src/` → `404 File not found` (busca `src/src/index.html`).

### Opción C — Node / VS Code

```bash
npx serve src -l 3000
# abre http://localhost:3000
# VS Code: clic derecho en src/index.html → "Open with Live Server"
```

### Por qué no doble clic / file://

`src/index.html` usa `type="module"` (`import ... from './store.js?v=31'`). Con `file://` el navegador bloquea los imports por CORS y la app queda vacía. Usa siempre un servidor local.

## Puertos y caché

- Puerto por defecto: **8000** (puedes usar `8001`, `3000`, etc.).
- Tras cada versión nueva, haz **Ctrl+Shift+R** (hard reload). Verifica `?v=31` en Network o `Creeky v31` en consola / Sincronización → `Código v31`.

## Datos y persistencia

- Clave `localStorage`: `creeky_db_v1` (`src/js/store.js:2`). Contiene `users, session, tasks, lists, tags, habits, matrix, countdowns, pomoLog, notifications`.
- `migrate()` (`store.js:46`) crea colecciones faltantes y mueve tareas huérfanas a `inbox`.
- **Respaldo**: Sincronización → Descargar JSON / Importar JSON. Hazlo antes de borrar datos del sitio.

## Modal Nueva tarea

`src/index.html:304` + `src/css/pages.css:354` — Título* (lápiz 16px), Lista + Prioridad (swatches `!`), Descripción, Fecha+Hora (calendario/reloj 16px), Duración + Avisar, Repetir días L-D, **Reservar Pomodoro** (switch `34×20px` + preview `pomo-blocks` con `calcPomodoroBlocks()`), Etiquetas (tag 16px). Fix `v30` corrige `main.css:149 svg{display:block}` → iconos `16px` (`pages.css:357`).

## Atajos

- `Ctrl+K / ⌘K` → Búsqueda
- `+ Añadir` / `#tasks` → Nueva tarea (foco en Título)
- Chips `L M X J V S D` → repetir por día

## Tema

Monocromo blanco↔negro (`--bg-primary`, `--accent: #1A1A2E` en `src/css/main.css:6`). Colores de listas (`#3949AB`, `#00897B`, …) son acentos puntuales.

## Solución de problemas

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `404 File not found` en `localhost:8000` | Servidor lanzado desde `src/` pero abres `/src/index.html` (o viceversa) | Lanza desde `Creeky/` y abre `http://localhost:8000/` (Opción A). |
| Pantalla vacía, `Failed to load module` | Abriste con `file://` | Usa `python -m http.server` o `npx serve`. |
| Sigues en `v30` tras pull | Caché | `Ctrl+Shift+R`, verifica `?v=31`. |
| `favicon.ico 404` | Antes sin favicon | Ya es `<link rel="icon" href="data:,">` (`src/index.html:11`). |
| `No está encriptado / Not secure` | `http://localhost` sin TLS | Normal en local. No necesitas `https`. |
| Iconos gigantes en modal | `svg{display:block}` | Corregido en `pages.css:357 v30`. Hard reload. |

## Changelog

- **v31** — Tarjetas Pomodoro del día compactas (puntos `6px`, menos info).
- **v30** — Fix iconos gigantes modal, favicon `data:`, wiring preview Pomodoro, bump `?v=30`.
- **v29** — Pomodoro reserva vinculada.

## Roadmap

- [ ] Temas / colores globales
- [ ] Atajos 1-9 por sección
- [ ] Notificaciones nativas del navegador
