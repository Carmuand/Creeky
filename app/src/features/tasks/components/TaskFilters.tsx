import { PRIO_META } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import { Select } from "@/components/ui/Select";
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
      <div className="min-w-30">
        <Select value={view.prio} onChange={(v) => onChange({ prio: v })} options={[{ value: "all", label: "Todas" }, ...Object.entries(PRIO_META).map(([v, m]) => ({ value: v, label: m.label }))]} placeholder="Prioridad" />
      </div>
      <div className="min-w-32.5">
        <Select value={view.tag} onChange={(v) => onChange({ tag: v })} options={[{ value: "all", label: "# Todas" }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]} placeholder="# Etiqueta" />
      </div>
      <div className="min-w-30">
        <Select value={view.sort} onChange={(v) => onChange({ sort: v })} options={[{ value: "manual", label: "Manual" }, { value: "due", label: "Por fecha" }, { value: "prio", label: "Por prioridad" }, { value: "title", label: "A–Z" }]} placeholder="Ordenar" />
      </div>
      <button className="inline-flex items-center gap-1.5 rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent) transition-colors" onClick={onReset}><Icon name="xcirc" size={13} /> Limpiar</button>
    </div>
  );
}
