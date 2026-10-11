import { useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useCreekyFocus } from "@/hooks/useCreekyFocus";
import { pushToast } from "@/hooks/useToast";
import type { ToastFn } from "@/hooks/useToast";
import { useI18n } from "@/i18n";
import { todayISO, weekEndISO } from "@/utils/date";
import { useTasksUi } from "./hooks/useTasksUi";
import { createTaskActions } from "./hooks/useTaskActions";
import { Segments } from "./components/Segments";
import { TaskFilters } from "./components/TaskFilters";
import { ListsPanel } from "./components/ListsPanel";
import { TagsPanel } from "./components/TagsPanel";
import { TaskItem } from "./components/TaskItem";
import { TaskBoard } from "./components/TaskBoard";
import { QuickAddModal, ListModal, TagModal } from "./components/QuickAddModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Task } from "@/types/creeky";

/**
 * Tasks view with lists, tags, filters, list and board layouts.
 *
 * @param props - Component properties.
 * @param props.onToast - Shows a toast; defaults to the shared toast stack.
 * @returns The tasks view.
 */
export function TasksView({ onToast }: { onToast?: ToastFn }) {
  const { store } = useCreekyStore();
  const { focusId, setFocus } = useCreekyFocus();
  const { t } = useI18n();
  const toast: ToastFn = onToast ?? pushToast;

  const { ui, updateView, setFilter, setSub, closeDetail, resetFilters, derived } = useTasksUi(store);
  const actions = createTaskActions({ toast, setFocus, closeDetail });

  const [inlineTitle, setInlineTitle] = useState("");
  const [quick, setQuick] = useState<{ open: boolean; preset?: Partial<Pick<Task, "list" | "due">> }>({ open: false });
  const [listModal, setListModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [tagModal, setTagModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isBoard = ui.view.layout === "board" || ui.filter === "all";
  const columns =
    derived.trash.length && ui.sub === "trash"
      ? [{ id: "__trash", name: t("tasks.trash"), color: "#C62828", icon: "", description: "" }]
      : (["all", "today", "trash"].includes(ui.filter) ? derived.visLists : derived.visLists.filter((l) => l.id === ui.filter));

  const filterLabel = ui.filter === "all" ? t("tasks.filter.all") : ui.filter === "today" ? t("common.today") : store.lists.find((l) => l.id === ui.filter)?.name ?? ui.filter;

  const tabBtn = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"}`;

  return (
    <section className="max-w-275 mx-auto animate-[fadeIn_200ms_ease]" aria-label={t("tasks.aria")}>
      <datalist id="tag-options">{store.tags.map((tag) => <option key={tag} value={tag} />)}</datalist>

      <div className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-sm text-(--muted)">{t("tasks.summary", { open: derived.openTasks.length, done: derived.doneT.length, trash: derived.trash.length })}</p></div>
        <div className="flex gap-2"><Button variant="primary" onClick={() => setQuick({ open: true })}>{t("tasks.new")}</Button></div>
      </div>

      <Segments counts={derived.segments} onAdd={(preset) => setQuick({ open: true, preset })} todayISO={todayISO()} weekEndISO={weekEndISO()} />

      <div className="grid grid-cols-[280px_1fr] gap-4 items-start max-[900px]:grid-cols-1">
        <aside className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
          <ListsPanel
            lists={store.lists}
            visLists={derived.visLists}
            alive={derived.alive}
            trashCount={derived.trash.length}
            activeFilter={ui.filter}
            view={ui.view}
            onChangeView={(p) => updateView(p)}
            onSelect={setFilter}
            onNewList={() => setListModal({ open: true, editId: null })}
            onEditList={(id) => setListModal({ open: true, editId: id })}
            onToast={toast}
            onEmptyTrash={() => { void actions.emptyTrash(); }}
          />
          <div className="my-3 h-px bg-(--border-light)" />
          <TagsPanel
            tags={store.tags}
            visTags={derived.visTags}
            view={ui.view}
            activeTag={ui.view.tag}
            onChangeView={(p) => updateView(p)}
            onSetActiveTag={(tag) => updateView({ tag })}
            onNewTag={() => setTagModal(true)}
            onToast={toast}
          />
        </aside>

        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--secondary) to-(--accent)" />
          {ui.filter !== "trash" ? (
            <form onSubmit={(e) => { e.preventDefault(); void actions.createInline(inlineTitle, ui.filter); setInlineTitle(""); }} className="flex gap-2 border-b border-(--border-light) p-4">
              <Input value={inlineTitle} onChange={(e) => setInlineTitle(e.target.value)} placeholder={t("tasks.inline.placeholder", { list: filterLabel })} className="flex-1" />
              <Button variant="primary" type="submit">{t("common.add")}</Button>
            </form>
          ) : null}

          <TaskFilters view={ui.view} tags={store.tags} onChange={updateView} onReset={resetFilters} />

          {ui.filter !== "trash" ? (
            <div className="flex gap-2 px-4 pt-3">
              <button className={tabBtn(ui.sub === "open")} onClick={() => setSub("open")}>{t("tasks.tab.open", { count: derived.openTasks.length })}</button>
              <button className={tabBtn(ui.sub === "done")} onClick={() => setSub("done")}>{t("tasks.tab.done", { count: derived.doneT.length })}</button>
              <button className={tabBtn(ui.sub === "trash")} onClick={() => setSub("trash")}>{t("tasks.tab.trash", { count: derived.trash.length })}</button>
            </div>
          ) : <h4 className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("tasks.tab.trash", { count: derived.trash.length })}</h4>}

          {isBoard ? (
            <TaskBoard
              columns={columns}
              tasks={derived.boardShown}
              store={store}
              onDrop={(e, zone) => { void actions.handleBoardDrop(e.dataTransfer.getData("text/plain"), zone); }}
              onDragStart={(e, id) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; }}
              onCheck={(id) => { void actions.toggleDone(id); }}
            />
          ) : (
            <div className="flex flex-col gap-2 p-3">
              {derived.shown.length ? derived.shown.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  store={store}
                  focusId={focusId}
                  isTrash={ui.filter === "trash" || !!task.deleted}
                  onCheck={() => { void actions.toggleDone(task.id); }}
                  onDelete={() => { void actions.softDelete(task.id); }}
                  onRestore={() => { void actions.restore(task.id); }}
                  onPermDelete={() => setConfirmDeleteId(task.id)}
                  onCyclePrio={() => { void actions.cyclePrio(task.id); }}
                  onFocus={() => { void actions.reservePomodoro(task.id); }}
                  onSaveDetail={(patch) => actions.saveDetail(task.id, patch)}
                  onRepeatToggle={(day) => { void actions.toggleRepeat(task.id, day); }}
                  onMove={(listId) => { void actions.move(task.id, listId); }}
                />
              )) : <p className="p-2 text-sm text-(--muted)">{t("tasks.empty")}</p>}
            </div>
          )}

          {(ui.filter === "trash" || ui.sub === "trash") && derived.trash.length ? (
            <div className="flex justify-end items-center gap-3 border-t border-(--border-light) bg-(--bg-secondary) p-3">
              <span className="text-sm text-(--muted)">{t("tasks.emptyTrash")}</span>
              <DeleteButton onConfirm={() => { void actions.emptyTrash(); }} />
            </div>
          ) : null}
        </div>
      </div>

      <QuickAddModal open={quick.open} onClose={() => setQuick({ open: false })} preset={quick.preset} onToast={toast} />
      <ListModal open={listModal.open} onClose={() => setListModal({ open: false, editId: null })} editId={listModal.editId} onToast={toast} />
      <TagModal open={tagModal} onClose={() => setTagModal(false)} onToast={toast} />
      <ConfirmDialog
        open={!!confirmDeleteId}
        title={t("tasks.confirmDelete.title")}
        description={t("tasks.confirmDelete.text")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (confirmDeleteId) void actions.permDelete(confirmDeleteId); setConfirmDeleteId(null); }}
      />
    </section>
  );
}
