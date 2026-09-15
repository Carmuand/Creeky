import { Placeholder } from "@/components/ui/Placeholder";
import { useCreekyStore } from "@/hooks/useCreekyStore";

/**
 * TasksView — first feature to be fully ported.
 * For now renders a live summary wired to the real storage so the migration path is visible.
 * Incremental steps:
 *  1. Replace innerHTML (pages.js -> TasksPage) with JSX here.
 *  2. Extract list/tag panels, board, detail drawer into ./components/*.
 *  3. Move filtering state (currentFilter/sub/layout) into local hooks.
 */
export function TasksView() {
  const { store } = useCreekyStore();
  const alive = store.tasks.filter((t) => !t.deleted);
  const pending = alive.filter((t) => !t.done).length;
  const done = alive.filter((t) => t.done).length;
  const trash = store.tasks.filter((t) => t.deleted).length;

  return (
    <section className="page" aria-label="Tareas y listas">
      <div className="page-head">
        <div>
          <p>{pending} pendientes • {done} completadas • {trash} eliminadas</p>
        </div>
        <div className="page-actions">
          <span className="tag" style={{ background: "var(--accent-light)", borderColor: "var(--accent-border)" }}>Migrando a React…</span>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3>Tareas — vista en migración</h3>
        <p className="text-secondary" style={{ marginTop: 6, fontSize: 14 }}>
          El template completo está en <code>src/js/pages.js:TasksPage</code>. Se portará a JSX por componentes:
          <code style={{ marginLeft: 6 }}>features/tasks/components/*</code>
        </p>
        <div className="stat-row" style={{ marginTop: 16 }}>
          <div className="card stat"><b>{alive.length}</b><span>Total vivas</span></div>
          <div className="card stat"><b>{pending}</b><span>Pendientes</span></div>
          <div className="card stat"><b>{store.lists.length}</b><span>Listas</span></div>
          <div className="card stat"><b>{store.tags.length}</b><span>Etiquetas</span></div>
        </div>
      </div>

      <Placeholder
        title="Tareas"
        description="Aquí irá la lista completa (filtros, board Kanban, detalle inline, drag & drop). Usa useCreekyStore para leer/escribir y preserva la key creeky_db_v1."
      />
    </section>
  );
}
