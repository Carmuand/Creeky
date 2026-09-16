import { useState, useMemo } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { PRIO_META } from "@/types/creeky";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function SearchView() {
  const { store } = useCreekyStore();
  const [q, setQ] = useState("");
  const [fList, setFList] = useState("all");
  const [fPrio, setFPrio] = useState("all");
  const [fState, setFState] = useState("all");

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const ql = q.toLowerCase();
    let res = store.tasks.filter((t) => !t.deleted && ((t.title + " " + (t.description || "") + " " + (t.tags || []).join(" ") + " " + t.list).toLowerCase().includes(ql)));
    if (fList !== "all") res = res.filter((t) => t.list === fList);
    if (fPrio !== "all") res = res.filter((t) => (t.priority || "none") === fPrio);
    if (fState === "open") res = res.filter((t) => !t.done);
    if (fState === "done") res = res.filter((t) => t.done);
    return res;
  }, [store.tasks, q, fList, fPrio, fState]);

  return (
    <section className="max-w-[1100px] mx-auto flex flex-col gap-4" aria-label="Búsqueda">
      <p className="text-sm text-(--muted)">Busca por título, descripción o etiqueta. Atajo: Ctrl + K</p>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe para buscar…" autoFocus />
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="min-w-[160px]"><Select value={fList} onChange={setFList} options={[{ value: "all", label: "Todas las listas" }, ...store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))]} /></div>
          <div className="min-w-[140px]"><Select value={fPrio} onChange={setFPrio} options={[{ value: "all", label: "Todas" }, ...Object.entries(PRIO_META).map(([v, m]) => ({ value: v, label: m.label }))]} /></div>
          <div className="min-w-[140px]"><Select value={fState} onChange={setFState} options={[{ value: "all", label: "Todas" }, { value: "open", label: "Pendientes" }, { value: "done", label: "Hechas" }]} /></div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {!q.trim() ? <p className="py-2 text-sm text-(--muted)">Empieza a escribir para ver resultados en vivo.</p> : results.length ? (
            <>
              <p className="text-xs text-(--muted)">{results.length} resultado(s)</p>
              {results.map((t) => (
                <div key={t.id} className="flex gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-4 py-3">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${t.done ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary)"}`}>{t.done ? "✓" : "○"}</span>
                  <div className="flex-1 min-w-0">
                    <b className="block truncate text-sm">{t.title}</b>
                    <div className="text-xs text-(--muted)">{store.lists.find((l) => l.id === t.list)?.name || t.list} {t.due ? `• ${t.due}${t.dueTime ? ` ${t.dueTime}` : ""}` : ""} {(t.tags || []).map((x) => `#${x}`).join(" ")}</div>
                    {t.description ? <div className="mt-1 line-clamp-2 text-xs text-(--text-soft)">{t.description.slice(0, 120)}</div> : null}
                  </div>
                </div>
              ))}
            </>
          ) : <p className="py-2 text-sm text-(--muted)">Sin resultados con esos filtros.</p>}
        </div>
      </div>
    </section>
  );
}
