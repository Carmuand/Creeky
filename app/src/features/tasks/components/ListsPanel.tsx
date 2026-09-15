import { useState } from "react";
import type { TaskList, Task } from "@/types/creeky";
import { CreekyIcon } from "@/components/icons/CreekyIcon";
import { db } from "@/services/storage";

interface ListsPanelProps {
  lists: TaskList[];
  visLists: TaskList[];
  alive: Task[];
  trashCount: number;
  activeFilter: string;
  view: { listSort: boolean; hideEmpty: boolean };
  onChangeView: (patch: Partial<{ listSort: boolean; hideEmpty: boolean }>) => void;
  onSelect: (id: string) => void;
  onNewList: () => void;
  onEditList: (id: string) => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
  onRefresh: () => void;
}

export function ListsPanel({ lists, visLists, alive, trashCount, activeFilter, view, onChangeView, onSelect, onNewList, onEditList, onToast, onRefresh }: ListsPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [armed, setArmed] = useState(false);

  const handleEmptyTrash = () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 5000);
      onToast("Clic de nuevo para vaciar del todo", "warning");
      return;
    }
    const s = db.load();
    const n = s.tasks.filter((t) => t.deleted).length;
    s.tasks = s.tasks.filter((t) => !t.deleted);
    db.save(s);
    onRefresh();
    onToast(`Papelera vaciada: ${n} registro(s) eliminados del todo.`, "warning");
    setArmed(false);
  };

  return (
    <div className="panel-sec">
      <div className="panel-sec-head">
        <span className="panel-sec-icon"><CreekyIcon name="list" size={16} /></span>
        <h3>Listas <span className="panel-count">({lists.length})</span></h3>
        <span className="menu-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn sm" onClick={() => setMenuOpen((v) => !v)} title="Opciones de listas"><CreekyIcon name="gear" size={15} /></button>
          {menuOpen ? (
            <span className="menu-dropdown">
              <button onClick={() => onChangeView({ listSort: !view.listSort })}>Ordenar A–Z {view.listSort ? "✓" : ""}</button>
              <button onClick={() => onChangeView({ hideEmpty: !view.hideEmpty })}>{view.hideEmpty ? "Mostrar vacías" : "Ocultar vacías"}</button>
              <button onClick={handleEmptyTrash}>{armed ? "¿Seguro? Clic de nuevo" : "Vaciar papelera"}</button>
            </span>
          ) : null}
        </span>
        <button className="icon-btn sm" onClick={onNewList} title="Nueva lista"><CreekyIcon name="plus" size={15} /></button>
      </div>

      <button className={`list-item ${activeFilter === "all" ? "active" : ""}`} onClick={() => onSelect("all")}>
        <span className="list-emoji"><CreekyIcon name="board" size={15} /></span> Todas <span className="list-count">{alive.filter((t) => !t.done).length}</span>
      </button>
      <button className={`list-item ${activeFilter === "today" ? "active" : ""}`} onClick={() => onSelect("today")}>
        <span className="list-emoji"><CreekyIcon name="calendar" size={15} /></span> Hoy <span className="list-count">{alive.filter((t) => t.due === new Date().toISOString().slice(0, 10) && !t.done).length}</span>
      </button>

      {visLists.map((l) => {
        const lt = alive.filter((t) => t.list === l.id);
        const lo = lt.filter((t) => !t.done).length;
        return (
          <div key={l.id} className={`list-row ${activeFilter === l.id ? "active" : ""}`}>
            <button className="list-item" onClick={() => onSelect(l.id)} style={{ flex: 1, minWidth: 0 }} title={`${l.description || "Sin descripción"} • ${lo} pendientes`}>
              <span className="list-emoji">{l.icon || "📋"}</span><span className="list-dot" style={{ background: l.color }} /> {l.name} <span className="list-count">{lo}</span>
            </button>
            <button className="icon-btn sm" onClick={() => onEditList(l.id)} title="Configurar lista"><CreekyIcon name="gear" size={14} /></button>
          </div>
        );
      })}

      <button className={`list-item ${activeFilter === "trash" ? "active" : ""}`} onClick={() => onSelect("trash")}>
        <span className="list-emoji"><CreekyIcon name="trash" size={15} /></span> Eliminadas <span className="list-count">{trashCount}</span>
      </button>
    </div>
  );
}
