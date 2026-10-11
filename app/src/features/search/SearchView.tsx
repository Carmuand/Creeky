import { useState, useMemo } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useI18n } from "@/i18n";
import { usePrioMeta } from "@/i18n/labels";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

/**
 * Live search over tasks with list, priority and state filters.
 *
 * @returns The search view.
 */
export function SearchView() {
  const { store } = useCreekyStore();
  const { t: tr } = useI18n();
  const PRIO_META = usePrioMeta();
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
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={tr("nav.search")}>
      <p className="text-sm text-(--muted)">{tr("search.intro")}</p>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("search.placeholder")} autoFocus />
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="min-w-40"><Select value={fList} onChange={setFList} options={[{ value: "all", label: tr("common.allLists") }, ...store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))]} /></div>
          <div className="min-w-35"><Select value={fPrio} onChange={setFPrio} options={[{ value: "all", label: tr("common.allFeminine") }, ...Object.entries(PRIO_META).map(([v, m]) => ({ value: v, label: m.label }))]} /></div>
          <div className="min-w-35"><Select value={fState} onChange={setFState} options={[{ value: "all", label: tr("common.allFeminine") }, { value: "open", label: tr("search.state.open") }, { value: "done", label: tr("search.state.done") }]} /></div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {!q.trim() ? <p className="py-2 text-sm text-(--muted)">{tr("search.start")}</p> : results.length ? (
            <>
              <p className="text-xs text-(--muted)">{tr("search.results", { count: results.length })}</p>
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
          ) : <p className="py-2 text-sm text-(--muted)">{tr("search.empty")}</p>}
        </div>
      </div>
    </section>
  );
}
