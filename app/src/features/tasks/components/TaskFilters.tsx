import { PRIO_META } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import type { TasksViewState } from "../hooks/useTasksUi";

interface TaskFiltersProps {
  view: TasksViewState;
  tags: string[];
  onChange: (patch: Partial<TasksViewState>) => void;
  onReset: () => void;
}

export function TaskFilters({ view, tags, onChange, onReset }: TaskFiltersProps) {
  const chip = (active: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${active ? "bg-(--accent) border-(--accent) font-semibold text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"}`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-(--border-light) px-4 py-3" role="group" aria-label="Filtros de tareas">
      <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Filtrar:</span>
      <button className={chip(view.layout !== "board")} onClick={() => onChange({ layout: "list" })}>Lista</button>
      <button className={chip(view.layout === "board")} onClick={() => onChange({ layout: "board" })}>Tablero</button>
      <select value={view.prio} onChange={(e) => onChange({ prio: e.target.value })} className="rounded-md border border-(--border-medium) bg-(--bg-primary) px-2 py-1.5 text-xs text-(--text) hover:border-(--border-dark) focus:border-(--accent) focus:outline-none">
        <option value="all">Todas</option>
        {Object.entries(PRIO_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
      </select>
      <select value={view.tag} onChange={(e) => onChange({ tag: e.target.value })} className="rounded-md border border-(--border-medium) bg-(--bg-primary) px-2 py-1.5 text-xs text-(--text) hover:border-(--border-dark) focus:border-(--accent) focus:outline-none">
        <option value="all"># Todas</option>
        {tags.map((t) => <option key={t} value={t}>#{t}</option>)}
      </select>
      <select value={view.sort} onChange={(e) => onChange({ sort: e.target.value })} className="rounded-md border border-(--border-medium) bg-(--bg-primary) px-2 py-1.5 text-xs text-(--text) hover:border-(--border-dark) focus:border-(--accent) focus:outline-none">
        <option value="manual">Manual</option>
        <option value="due">Por fecha</option>
        <option value="prio">Por prioridad</option>
        <option value="title">A–Z</option>
      </select>
      <button className="inline-flex items-center gap-1.5 rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={onReset}><Icon name="xcirc" size={13} /> Limpiar</button>
    </div>
  );
}
