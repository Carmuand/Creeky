import { PRIO_META } from "@/types/creeky";
import { CreekyIcon } from "@/components/icons/CreekyIcon";
import type { TasksViewState } from "../hooks/useTasksUi";

interface TaskFiltersProps {
  view: TasksViewState;
  tags: string[];
  onChange: (patch: Partial<TasksViewState>) => void;
  onReset: () => void;
}

export function TaskFilters({ view, tags, onChange, onReset }: TaskFiltersProps) {
  return (
    <div className="filter-bar" role="group" aria-label="Filtros de tareas">
      <span className="filter-label">Filtrar:</span>
      <button className={`chip ${view.layout !== "board" ? "active" : ""}`} onClick={() => onChange({ layout: "list" })}>Lista</button>
      <button className={`chip ${view.layout === "board" ? "active" : ""}`} onClick={() => onChange({ layout: "board" })}>Tablero</button>
      <select value={view.prio} onChange={(e) => onChange({ prio: e.target.value })} className="form-select">
        <option value="all">Todas</option>
        {Object.entries(PRIO_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
      </select>
      <select value={view.tag} onChange={(e) => onChange({ tag: e.target.value })} className="form-select">
        <option value="all"># Todas</option>
        {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
      </select>
      <select value={view.sort} onChange={(e) => onChange({ sort: e.target.value })} className="form-select">
        <option value="manual">Manual</option>
        <option value="due">Por fecha</option>
        <option value="prio">Por prioridad</option>
        <option value="title">A–Z</option>
      </select>
      <button className="chip" onClick={onReset}><CreekyIcon name="xcirc" size={13} /> Limpiar</button>
    </div>
  );
}
