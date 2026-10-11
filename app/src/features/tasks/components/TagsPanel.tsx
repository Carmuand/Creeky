import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { DeleteButton } from "@/components/ui/delete-button";
import { errorMessage, useI18n } from "@/i18n";
import type { ToastFn } from "@/hooks/useToast";
import { tagsApi } from "@/services/api";

/**
 * Properties for the {@link TagsPanel} component.
 */
interface TagsPanelProps {
  tags: string[];
  visTags: string[];
  view: { tagSort: boolean };
  activeTag: string;
  onChangeView: (patch: Partial<{ tagSort: boolean }>) => void;
  onSetActiveTag: (tag: string) => void;
  onNewTag: () => void;
  onToast: ToastFn;
}

/**
 * Sidebar panel listing the tags with rename and delete actions.
 *
 * @param props - Component properties.
 * @returns The tags panel.
 */
export function TagsPanel({ tags, visTags, view, activeTag, onChangeView, onSetActiveTag, onNewTag, onToast }: TagsPanelProps) {
  const { t } = useI18n();

  const handleClean = async () => {
    try {
      const gone = await tagsApi.removeUnused();
      onToast(gone ? t("tags.toast.cleaned", { count: gone }) : t("tags.toast.allUsed"), gone ? "warning" : "info");
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--secondary-light) text-(--secondary)"><Icon name="tag" size={16} /></span>
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-widest text-(--muted)">{t("task.tags")} <span className="font-normal">({tags.length})</span></h3>
        <Dropdown
          trigger={
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" aria-label={t("tags.options")}>
              <Icon name="gear" size={15} />
            </button>
          }
        >
          <DropdownItem onClick={() => onChangeView({ tagSort: !view.tagSort })}>{t("common.sortAZ")} {view.tagSort ? "✓" : ""}</DropdownItem>
          <DropdownItem onClick={() => { void handleClean(); }}>{t("tags.removeUnused")}</DropdownItem>
        </Dropdown>
        <TooltipSimple content={t("tags.new")} side="top">
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={onNewTag} aria-label={t("tags.new")}><Icon name="plus" size={15} /></button>
        </TooltipSimple>
      </div>

      <div className="flex flex-col gap-1 px-1">
        {visTags.map((tag) => (
          <InlineTag key={tag} tag={tag} activeTag={activeTag} onSetActiveTag={onSetActiveTag} onToast={onToast} />
        ))}
        {!visTags.length ? <p className="px-2 text-xs text-(--muted)">{t("tags.empty")}</p> : null}
      </div>
    </div>
  );
}

/**
 * Tag row with inline rename and delete.
 *
 * @param props - Component properties.
 * @param props.tag - Tag name.
 * @param props.activeTag - Tag currently used as filter.
 * @param props.onSetActiveTag - Changes the tag used as filter.
 * @param props.onToast - Shows a toast.
 * @returns The tag row.
 */
function InlineTag({ tag, activeTag, onSetActiveTag, onToast }: { tag: string; activeTag: string; onSetActiveTag: (t: string) => void; onToast: ToastFn }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(tag);

  const save = async () => {
    const v = val.trim().toLowerCase();
    if (!v) return;
    try {
      if (v !== tag) {
        const result = await tagsApi.rename(tag, v);
        if (result.merged) onToast(t("tags.toast.merged", { name: v }), "warning");
        if (activeTag === tag) onSetActiveTag(v);
      }
      setEditing(false);
      onToast(t("tags.toast.updated"), "success");
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  const remove = async () => {
    try {
      await tagsApi.remove(tag);
      if (activeTag === tag) onSetActiveTag("all");
      onToast(t("tags.toast.removed", { name: tag }), "warning");
    } catch (error) {
      onToast(errorMessage(error), "error");
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 rounded-md px-1 py-1">
        <Input value={val} onChange={(e) => setVal(e.target.value)} className="flex-1 min-w-0" autoFocus onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") { setEditing(false); setVal(tag); } }} />
        <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setVal(tag); }}>{t("common.cancel")}</Button>
        <Button variant="primary" size="sm" onClick={() => { void save(); }}>OK</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-(--bg-hover) transition-colors">
      <span className={`flex-1 rounded-full border px-2 py-0.5 text-xs ${activeTag === tag ? "bg-(--secondary-light) border-(--secondary-border) text-(--secondary) font-medium" : "bg-(--bg-tertiary) border-(--border-light)"}`}>#{tag}</span>
      <span className="flex gap-1">
        <TooltipSimple content={t("tags.rename")} side="top">
          <button className="flex h-6 w-6 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-primary) hover:text-(--text) transition-colors" onClick={() => { setVal(tag); setEditing(true); }} aria-label={t("tags.rename")}><Icon name="pencil" size={14} /></button>
        </TooltipSimple>
        <DeleteButton onConfirm={() => { void remove(); }} className="scale-[0.5] origin-right -my-2 -mr-1" />
      </span>
    </div>
  );
}