import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useEisenhower } from "./hooks/useEisenhower";
import { Quadrant } from "./components/Quadrant";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { db } from "@/services/storage";
import { Q_PRIO } from "@/types/creeky";

export function EisenhowerView() {
  const { store, refresh } = useCreekyStore();
  const { view, setList, setFilterText, reset } = useEisenhower();

  const alive = store.tasks.filter((t) => !t.deleted && !t.done);
  const effQ = (t: { priority?: string }) => ({ high: "q1", medium: "q2", low: "q3" }[(t.priority || "none") as string] || "q4");
  const inList = (t: { list: string }) => view.list === "all" || t.list === view.list;

  const auto = {
    q1: alive.filter((t) => effQ(t) === "q1" && inList(t)),
    q2: alive.filter((t) => effQ(t) === "q2" && inList(t)),
    q3: alive.filter((t) => effQ(t) === "q3" && inList(t)),
    q4: alive.filter((t) => effQ(t) === "q4" && inList(t)),
  } as const;

  const handleAddManual = (q: "q1" | "q2" | "q3" | "q4", text: string) => {
    const s = db.load();
    s.matrix[q].push(text);
    db.save(s);
    refresh();
  };

  const handleDeleteManual = (q: "q1" | "q2" | "q3" | "q4", idx: number) => {
    const s = db.load();
    s.matrix[q].splice(idx, 1);
    db.save(s);
    refresh();
  };

  const handleDrop = (e: React.DragEvent, targetQ: "q1" | "q2" | "q3" | "q4") => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    const s = db.load();
    if (raw.startsWith("t:")) {
      const id = raw.slice(2);
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.priority = Q_PRIO[targetQ];
      (t as unknown as { quadrant: string }).quadrant = "";
      db.save(s);
      refresh();
    } else if (raw.startsWith("n:")) {
      const [, q, idxStr] = raw.slice(2).split(":");
      const idx = Number(idxStr);
      const item = (s.matrix[q as "q1" | "q2" | "q3" | "q4"] || []).splice(idx, 1)[0];
      if (item === undefined) return;
      s.matrix[targetQ].push(item);
      db.save(s);
      refresh();
    }
  };

  const handleCopyAuto = () => {
    const s = db.load();
    const groups = { q1: [] as string[], q2: [] as string[], q3: [] as string[], q4: [] as string[] };
    alive.forEach((t) => {
      const q = effQ(t) as "q1" | "q2" | "q3" | "q4";
      groups[q].push(t.title + (t.due ? ` (${t.due})` : ""));
    });
    let n = 0;
    (Object.entries(groups) as [keyof typeof groups, string[]][]).forEach(([q, arr]) => {
      arr.forEach((label) => { if (!s.matrix[q].includes(label)) { s.matrix[q].push(label); n++; } });
    });
    db.save(s);
    refresh();
  };

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Matriz Eisenhower">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-150 text-sm text-(--muted)">Tablero Kanban sincronizado con la prioridad: Q1 alta • Q2 media • Q3 baja • Q4 ninguna. Arrastra para cambiarla.</p>
        <Button variant="primary" size="sm" onClick={handleCopyAuto}><Icon name="zap" size={14} /> Copiar auto a manual</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Filtrar:</span>
        <Input value={view.filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Texto…" className="max-w-50" />
        <div className="min-w-45">
          <Select value={view.list} onChange={setList} options={[{ value: "all", label: "Todas las listas" }, ...store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))]} />
        </div>
        <button onClick={reset} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-(--border-medium) bg-(--bg-primary) px-3 py-1 text-xs text-(--muted) hover:border-(--accent) hover:text-(--accent)"><Icon name="xcirc" size={13} /> Limpiar</button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Quadrant id="q1" title="Hacer primero" desc="Prioridad ¡Alta!" manual={view.list === "all" ? store.matrix.q1 : []} auto={auto.q1} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q1", t)} onDeleteManual={(i) => handleDeleteManual("q1", i)} onDrop={(e) => handleDrop(e, "q1")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q2" title="Planificar" desc="Prioridad ¡Media!" manual={view.list === "all" ? store.matrix.q2 : []} auto={auto.q2} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q2", t)} onDeleteManual={(i) => handleDeleteManual("q2", i)} onDrop={(e) => handleDrop(e, "q2")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q3" title="Delegar" desc="Prioridad ¡Baja!" manual={view.list === "all" ? store.matrix.q3 : []} auto={auto.q3} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q3", t)} onDeleteManual={(i) => handleDeleteManual("q3", i)} onDrop={(e) => handleDrop(e, "q3")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q4" title="Eliminar" desc="Sin prioridad" manual={view.list === "all" ? store.matrix.q4 : []} auto={auto.q4} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q4", t)} onDeleteManual={(i) => handleDeleteManual("q4", i)} onDrop={(e) => handleDrop(e, "q4")} onDragOver={(e) => e.preventDefault()} />
      </div>
    </section>
  );
}
