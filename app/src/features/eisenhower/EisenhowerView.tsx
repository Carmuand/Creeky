import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useEisenhower } from "./hooks/useEisenhower";
import { Quadrant } from "./components/Quadrant";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { matrixApi, tasksApi } from "@/services/api";
import { Q_PRIO } from "@/types/creeky";

/**
 * Eisenhower quadrant identifier.
 */
type QuadrantId = "q1" | "q2" | "q3" | "q4";

/**
 * Eisenhower matrix where quadrants mirror task priority and hold manual notes.
 *
 * @returns The Eisenhower view.
 */
export function EisenhowerView() {
  const { store } = useCreekyStore();
  const { t } = useI18n();

  const report = (error: unknown) => pushToast(errorMessage(error), "error");
  const { view, setList, setFilterText, reset } = useEisenhower();

  const alive = store.tasks.filter((task) => !task.deleted && !task.done);
  const effQ = (task: { priority?: string }): QuadrantId => (({ high: "q1", medium: "q2", low: "q3" } as Record<string, QuadrantId>)[task.priority || "none"] || "q4");
  const inList = (task: { list: string }) => view.list === "all" || task.list === view.list;

  const auto = {
    q1: alive.filter((task) => effQ(task) === "q1" && inList(task)),
    q2: alive.filter((task) => effQ(task) === "q2" && inList(task)),
    q3: alive.filter((task) => effQ(task) === "q3" && inList(task)),
    q4: alive.filter((task) => effQ(task) === "q4" && inList(task)),
  } as const;

  const handleAddManual = (q: QuadrantId, text: string) => {
    matrixApi.addNotes([{ quadrant: q, text }]).catch(report);
  };

  const handleDeleteManual = (q: QuadrantId, idx: number) => {
    matrixApi.removeNote(q, idx).catch(report);
  };

  const handleDrop = (e: React.DragEvent, targetQ: "q1" | "q2" | "q3" | "q4") => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (raw.startsWith("t:")) {
      tasksApi.update(raw.slice(2), { priority: Q_PRIO[targetQ], quadrant: "" }).catch(report);
    } else if (raw.startsWith("n:")) {
      const [, q, idxStr] = raw.split(":");
      if (q === targetQ) return;
      matrixApi.moveNote(q, Number(idxStr), targetQ).catch(report);
    }
  };

  const handleCopyAuto = () => {
    const notes = alive.map((task) => ({ quadrant: effQ(task), text: task.title + (task.due ? ` (${task.due})` : "") }));
    if (!notes.length) return;
    matrixApi.addNotes(notes, true).then((added) => pushToast(t("matrix.toast.copied", { count: added }), "info")).catch(report);
  };

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={t("nav.eisenhower")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-150 text-sm text-(--muted)">{t("matrix.intro")}</p>
        <Button variant="primary" size="sm" onClick={handleCopyAuto}><Icon name="zap" size={14} /> {t("matrix.copy")}</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <span className="text-xs font-semibold uppercase tracking-widest text-(--accent)">{t("common.filterColon")}</span>
        <Input value={view.filterText} onChange={(e) => setFilterText(e.target.value)} placeholder={t("matrix.filter.placeholder")} className="max-w-50" />
        <div className="min-w-45">
          <Select value={view.list} onChange={setList} options={[{ value: "all", label: t("common.allLists") }, ...store.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))]} />
        </div>
        <button onClick={reset} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-(--secondary-border) bg-(--secondary-light) px-3 py-1 text-xs text-(--secondary) hover:border-(--secondary) hover:text-(--secondary)"><Icon name="xcirc" size={13} /> {t("common.clear")}</button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <Quadrant id="q1" title={t("matrix.q1.title")} desc={t("matrix.q1.desc")} manual={view.list === "all" ? store.matrix.q1 : []} auto={auto.q1} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q1", t)} onDeleteManual={(i) => handleDeleteManual("q1", i)} onDrop={(e) => handleDrop(e, "q1")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q2" title={t("matrix.q2.title")} desc={t("matrix.q2.desc")} manual={view.list === "all" ? store.matrix.q2 : []} auto={auto.q2} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q2", t)} onDeleteManual={(i) => handleDeleteManual("q2", i)} onDrop={(e) => handleDrop(e, "q2")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q3" title={t("matrix.q3.title")} desc={t("matrix.q3.desc")} manual={view.list === "all" ? store.matrix.q3 : []} auto={auto.q3} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q3", t)} onDeleteManual={(i) => handleDeleteManual("q3", i)} onDrop={(e) => handleDrop(e, "q3")} onDragOver={(e) => e.preventDefault()} />
        <Quadrant id="q4" title={t("matrix.q4.title")} desc={t("matrix.q4.desc")} manual={view.list === "all" ? store.matrix.q4 : []} auto={auto.q4} store={store} filterText={view.filterText} onAddManual={(t) => handleAddManual("q4", t)} onDeleteManual={(i) => handleDeleteManual("q4", i)} onDrop={(e) => handleDrop(e, "q4")} onDragOver={(e) => e.preventDefault()} />
      </div>
    </section>
  );
}
