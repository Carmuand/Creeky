import { useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useCreekyFocus } from "@/hooks/useCreekyFocus";
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
import { db } from "@/services/storage";
import type { Task } from "@/types/creeky";

type ToastFn = (msg: string, type?: "info" | "success" | "warning" | "error") => void;

/**
 * TasksView — orquestador modular de Tareas.
 * Delegates UI state to useTasksUi and business logic to createTaskActions.
 */
export function TasksView({ onToast }: { onToast?: ToastFn }) {
  const { store, refresh } = useCreekyStore();
  const { focusId, setFocus } = useCreekyFocus();
  const toast: ToastFn = (m, t = "info") => {
    if (onToast) onToast(m, t);
    else window.__creeky_toast?.({ message: m, type: t });
  };

  const { ui, updateView, setFilter, setSub, toggleDetail, closeDetail, resetFilters, derived } = useTasksUi(store);
  const actions = createTaskActions({ refresh, toast, setFocus, closeDetail });

  const [inlineTitle, setInlineTitle] = useState("");
  const [quick, setQuick] = useState<{ open: boolean; preset?: Partial<Pick<Task, "list" | "due">> }>({ open: false });
  const [listModal, setListModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [tagModal, setTagModal] = useState(false);
  const [trashArmed, setTrashArmed] = useState(false);

  const isBoard = ui.view.layout === "board" || ui.filter === "all";
  const columns =
    derived.trash.length && ui.sub === "trash"
      ? [{ id: "__trash", name: "Eliminadas", color: "#C62828", icon: "", description: "" }]
      : (["all", "today", "trash"].includes(ui.filter) ? derived.visLists : derived.visLists.filter((l) => l.id === ui.filter));

  return (
    <section className="page" aria-label="Tareas y listas">
      <datalist id="tag-options">{store.tags.map((t) => <option key={t} value={t} />)}</datalist>

      <div className="page-head">
        <div><p>{derived.openTasks.length} pendientes • {derived.doneT.length} completadas • {derived.trash.length} eliminadas</p></div>
        <div className="page-actions"><button className="btn btn-primary" onClick={() => setQuick({ open: true })}>+ Nueva tarea</button></div>
      </div>

      <Segments counts={derived.segments} onAdd={(preset) => setQuick({ open: true, preset })} todayISO={todayISO()} weekEndISO={weekEndISO()} />

      <div className="tasks-layout">
        <aside className="card lists-panel">
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
            onRefresh={refresh}
          />
          <TagsPanel
            tags={store.tags}
            visTags={derived.visTags}
            view={ui.view}
            activeTag={ui.view.tag}
            onChangeView={(p) => updateView(p)}
            onSetActiveTag={(t) => updateView({ tag: t })}
            onNewTag={() => setTagModal(true)}
            onToast={toast}
            onRefresh={refresh}
          />
        </aside>

        <div className="card">
          {ui.filter !== "trash" ? (
            <form onSubmit={(e) => { e.preventDefault(); actions.createInline(inlineTitle, ui.filter); setInlineTitle(""); }} className="task-input-row">
              <input className="form-input" value={inlineTitle} onChange={(e) => setInlineTitle(e.target.value)} placeholder={`+ Añadir tarea a ${ui.filter}, pulsa Enter…`} />
              <button className="btn btn-primary">Añadir</button>
            </form>
          ) : null}

          <TaskFilters view={ui.view} tags={store.tags} onChange={updateView} onReset={resetFilters} />

          {ui.filter !== "trash" ? (
            <div className="sub-tabs">
              <button className={ui.sub === "open" ? "active" : ""} onClick={() => setSub("open")}>Pendientes ({derived.openTasks.length})</button>
              <button className={ui.sub === "done" ? "active" : ""} onClick={() => setSub("done")}>Completadas ({derived.doneT.length})</button>
              <button className={ui.sub === "trash" ? "active" : ""} onClick={() => setSub("trash")}>Eliminadas ({derived.trash.length})</button>
            </div>
          ) : <h4 className="task-group-title">Eliminadas ({derived.trash.length})</h4>}

          {isBoard ? (
            <TaskBoard
              columns={columns}
              tasks={derived.boardShown}
              store={store}
              onDrop={(e, zone) => actions.handleBoardDrop(e.dataTransfer.getData("text/plain"), zone)}
              onDragStart={(e, id) => { e.dataTransfer.setData("text/plain", id); e.dataTransfer.effectAllowed = "move"; }}
              onCheck={(id) => actions.toggleDone(id)}
            />
          ) : (
            <div className="task-list">
              {derived.shown.length ? derived.shown.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  store={store}
                  isOpen={ui.openDetails.has(t.id)}
                  focusId={focusId}
                  isTrash={ui.filter === "trash" || !!t.deleted}
                  onToggle={() => toggleDetail(t.id)}
                  onCheck={() => actions.toggleDone(t.id)}
                  onDelete={() => actions.softDelete(t.id)}
                  onRestore={() => actions.restore(t.id)}
                  onPermDelete={() => actions.permDelete(t.id)}
                  onCyclePrio={() => actions.cyclePrio(t.id)}
                  onFocus={() => actions.reservePomodoro(t.id)}
                  onSaveDetail={(patch) => actions.saveDetail(t.id, patch)}
                  onRepeatToggle={(d) => actions.toggleRepeat(t.id, d)}
                  onMove={(lid) => actions.move(t.id, lid)}
                />
              )) : <p className="text-secondary text-sm" style={{ padding: 8 }}>Nada por aquí.</p>}
            </div>
          )}

          {(ui.filter === "trash" || ui.sub === "trash") && derived.trash.length ? (
            <div className="form-actions" style={{ margin: "0 12px 12px" }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  if (!trashArmed) { setTrashArmed(true); setTimeout(() => setTrashArmed(false), 5000); toast("Clic de nuevo para vaciar del todo", "warning"); }
                  else { const st = db.load(); st.tasks = st.tasks.filter((x) => !x.deleted); db.save(st); refresh(); setTrashArmed(false); toast("Papelera vaciada", "warning"); }
                }}
              >
                {trashArmed ? "¿Seguro? Clic de nuevo para vaciar del todo" : "Vaciar papelera"}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <QuickAddModal open={quick.open} onClose={() => setQuick({ open: false })} preset={quick.preset} onToast={toast} onCreated={refresh} />
      <ListModal open={listModal.open} onClose={() => setListModal({ open: false, editId: null })} editId={listModal.editId} onToast={toast} />
      <TagModal open={tagModal} onClose={() => setTagModal(false)} onToast={toast} />
    </section>
  );
}
