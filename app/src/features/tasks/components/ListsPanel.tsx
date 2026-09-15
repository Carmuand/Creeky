import { useState } from "react";
import type { TaskList, Task } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { TooltipSimple } from "@/components/ui/Tooltip";
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

  const listItem = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${active ? "bg-(--accent-light) font-medium text-(--accent)" : "text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)"}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="list" size={16} /></span>
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-widest text-(--muted)">Listas <span className="font-normal text-(--muted)">({lists.length})</span></h3>
        <Dropdown
          trigger={
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" aria-label="Opciones de listas">
              <Icon name="gear" size={15} />
            </button>
          }
        >
          <DropdownItem onClick={() => onChangeView({ listSort: !view.listSort })}>Ordenar A–Z {view.listSort ? "✓" : ""}</DropdownItem>
          <DropdownItem onClick={() => onChangeView({ hideEmpty: !view.hideEmpty })}>{view.hideEmpty ? "Mostrar vacías" : "Ocultar vacías"}</DropdownItem>
          <DropdownItem onClick={handleEmptyTrash}>{armed ? "¿Seguro? Clic de nuevo" : "Vaciar papelera"}</DropdownItem>
        </Dropdown>
        <TooltipSimple content="Nueva lista" side="top">
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={onNewList} aria-label="Nueva lista"><Icon name="plus" size={15} /></button>
        </TooltipSimple>
      </div>

      <button className={listItem(activeFilter === "all")} onClick={() => onSelect("all")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="board" size={15} /></span> Todas <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{alive.filter((t) => !t.done).length}</span>
      </button>
      <button className={listItem(activeFilter === "today")} onClick={() => onSelect("today")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="calendar" size={15} /></span> Hoy <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{alive.filter((t) => t.due === new Date().toISOString().slice(0, 10) && !t.done).length}</span>
      </button>

      {visLists.map((l) => {
        const lt = alive.filter((t) => t.list === l.id);
        const lo = lt.filter((t) => !t.done).length;
        const active = activeFilter === l.id;
        return (
          <div key={l.id} className={`flex items-center gap-1 rounded-md ${active ? "bg-(--accent-light)" : ""}`}>
            <TooltipSimple content={`${l.description || "Sin descripción"} • ${lo} pendientes`} side="top">
              <button className={`${listItem(active)} flex-1 min-w-0`} onClick={() => onSelect(l.id)}>
                <span className="flex h-5 w-5 items-center justify-center text-base">{l.icon || "📋"}</span><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} /> <span className="truncate">{l.name}</span> <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{lo}</span>
              </button>
            </TooltipSimple>
            <TooltipSimple content="Configurar lista" side="top">
              <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={() => onEditList(l.id)} aria-label="Configurar lista"><Icon name="gear" size={14} /></button>
            </TooltipSimple>
          </div>
        );
      })}

      <button className={listItem(activeFilter === "trash")} onClick={() => onSelect("trash")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="trash" size={15} /></span> Eliminadas <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{trashCount}</span>
      </button>
    </div>
  );
}