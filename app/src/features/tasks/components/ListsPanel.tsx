import { useState } from "react";
import type { TaskList, Task } from "@/types/creeky";
import { Icon } from "@/components/icons/Icon";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n";
import type { ToastFn } from "@/hooks/useToast";

/**
 * Properties for the {@link ListsPanel} component.
 */
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
  onToast: ToastFn;
  onEmptyTrash: () => void;
}

/**
 * Sidebar panel listing the task lists with their pending counters.
 *
 * @param props - Component properties.
 * @returns The lists panel.
 */
export function ListsPanel({ lists, visLists, alive, trashCount, activeFilter, view, onChangeView, onSelect, onNewList, onEditList, onToast, onEmptyTrash }: ListsPanelProps) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);

  const handleEmptyTrash = () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 5000);
      onToast(t("lists.trash.armed"), "warning");
      return;
    }
    onEmptyTrash();
    setArmed(false);
  };

  const listItem = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${active ? "bg-(--accent-light) font-medium text-(--accent)" : "text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)"}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="list" size={16} /></span>
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("lists.title")} <span className="font-normal text-(--muted)">({lists.length})</span></h3>
        <Dropdown
          trigger={
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" aria-label={t("lists.options")}>
              <Icon name="gear" size={15} />
            </button>
          }
        >
          <DropdownItem onClick={() => onChangeView({ listSort: !view.listSort })}>{t("common.sortAZ")} {view.listSort ? "✓" : ""}</DropdownItem>
          <DropdownItem onClick={() => onChangeView({ hideEmpty: !view.hideEmpty })}>{view.hideEmpty ? t("lists.showEmpty") : t("lists.hideEmpty")}</DropdownItem>
          <DropdownItem onClick={handleEmptyTrash}>{armed ? t("lists.trash.confirm") : t("tasks.emptyTrash")}</DropdownItem>
        </Dropdown>
        <TooltipSimple content={t("lists.new")} side="top">
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={onNewList} aria-label={t("lists.new")}><Icon name="plus" size={15} /></button>
        </TooltipSimple>
      </div>

      <button className={listItem(activeFilter === "all")} onClick={() => onSelect("all")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="board" size={15} /></span> {t("common.allFeminine")} <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{alive.filter((t) => !t.done).length}</span>
      </button>
      <button className={listItem(activeFilter === "today")} onClick={() => onSelect("today")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="calendar" size={15} /></span> {t("common.today")} <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{alive.filter((t) => t.due === new Date().toISOString().slice(0, 10) && !t.done).length}</span>
      </button>

      {visLists.map((l) => {
        const lt = alive.filter((t) => t.list === l.id);
        const lo = lt.filter((t) => !t.done).length;
        const active = activeFilter === l.id;
        return (
          <div key={l.id} className={`flex items-center gap-1 rounded-md ${active ? "bg-(--accent-light)" : ""}`}>
            <TooltipSimple content={t("lists.tooltip", { description: l.description || t("task.noDescription"), count: lo })} side="top">
              <button className={`${listItem(active)} flex-1 min-w-0`} onClick={() => onSelect(l.id)}>
                <span className="flex h-5 w-5 items-center justify-center text-base">{l.icon || "📋"}</span><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} /> <span className="truncate">{l.name}</span> <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{lo}</span>
              </button>
            </TooltipSimple>
            <TooltipSimple content={t("lists.configure")} side="top">
              <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={() => onEditList(l.id)} aria-label={t("lists.configure")}><Icon name="gear" size={14} /></button>
            </TooltipSimple>
          </div>
        );
      })}

      <button className={listItem(activeFilter === "trash")} onClick={() => onSelect("trash")}>
        <span className="flex h-5 w-5 items-center justify-center text-base"><Icon name="trash" size={15} /></span> {t("tasks.trash")} <span className="ml-auto rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{trashCount}</span>
      </button>
    </div>
  );
}