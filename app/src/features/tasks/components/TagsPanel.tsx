import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { db } from "@/services/storage";

interface TagsPanelProps {
  tags: string[];
  visTags: string[];
  view: { tagSort: boolean };
  activeTag: string;
  onChangeView: (patch: Partial<{ tagSort: boolean }>) => void;
  onSetActiveTag: (tag: string) => void;
  onNewTag: () => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
  onRefresh: () => void;
}

export function TagsPanel({ tags, visTags, view, activeTag, onChangeView, onSetActiveTag, onNewTag, onToast, onRefresh }: TagsPanelProps) {
  const handleClean = () => {
    const s = db.load();
    const used = new Set<string>();
    s.tasks.forEach((t) => (t.tags || []).forEach((x) => used.add(x)));
    const gone = s.tags.filter((t) => !used.has(t)).length;
    s.tags = s.tags.filter((t) => used.has(t));
    db.save(s);
    onRefresh();
    onToast(gone ? `${gone} etiqueta(s) sin uso eliminadas.` : "Todas las etiquetas están en uso.", gone ? "warning" : "info");
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="tag" size={16} /></span>
        <h3 className="flex-1 text-xs font-semibold uppercase tracking-widest text-(--muted)">Etiquetas <span className="font-normal">({tags.length})</span></h3>
        <Dropdown
          trigger={
            <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" aria-label="Opciones de etiquetas">
              <Icon name="gear" size={15} />
            </button>
          }
        >
          <DropdownItem onClick={() => onChangeView({ tagSort: !view.tagSort })}>Ordenar A–Z {view.tagSort ? "✓" : ""}</DropdownItem>
          <DropdownItem onClick={handleClean}>Eliminar sin uso</DropdownItem>
        </Dropdown>
        <TooltipSimple content="Nueva etiqueta" side="top">
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={onNewTag} aria-label="Nueva etiqueta"><Icon name="plus" size={15} /></button>
        </TooltipSimple>
      </div>

      <div className="flex flex-col gap-1 px-1">
        {visTags.map((t) => (
          <InlineTag key={t} tag={t} activeTag={activeTag} onSetActiveTag={onSetActiveTag} onToast={onToast} onRefresh={onRefresh} />
        ))}
        {!visTags.length ? <p className="px-2 text-xs text-(--muted)">Sin etiquetas.</p> : null}
      </div>
    </div>
  );
}

function InlineTag({ tag, activeTag, onSetActiveTag, onToast, onRefresh }: { tag: string; activeTag: string; onSetActiveTag: (t: string) => void; onToast: TagsPanelProps["onToast"]; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(tag);

  const save = () => {
    const v = val.trim().toLowerCase();
    if (!v) return;
    const s = db.load();
    if (v !== tag) {
      if (s.tags.includes(v)) onToast(`#${v} ya existe; se fusionan.`, "warning");
      else s.tags = s.tags.map((t) => (t === tag ? v : t));
      s.tasks.forEach((t) => {
        t.tags = [...new Set((t.tags || []).map((x) => (x === tag ? v : x)))];
      });
      if (activeTag === tag) onSetActiveTag(v);
    }
    db.save(s);
    onRefresh();
    setEditing(false);
    onToast("Etiqueta actualizada.", "success");
  };

  const remove = () => {
    const s = db.load();
    s.tags = s.tags.filter((t) => t !== tag);
    s.tasks.forEach((t) => {
      t.tags = (t.tags || []).filter((x) => x !== tag);
    });
    if (activeTag === tag) onSetActiveTag("all");
    db.save(s);
    onRefresh();
    onToast(`Etiqueta #${tag} eliminada de todas las tareas.`, "warning");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 rounded-md px-1 py-1">
        <Input value={val} onChange={(e) => setVal(e.target.value)} className="flex-1 min-w-0" autoFocus onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setVal(tag); } }} />
        <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setVal(tag); }}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={save}>OK</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-(--bg-hover) transition-colors">
      <span className="flex-1 rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5 text-xs">#{tag}</span>
      <span className="flex gap-1">
        <TooltipSimple content="Renombrar" side="top">
          <button className="flex h-6 w-6 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-primary) hover:text-(--text) transition-colors" onClick={() => { setVal(tag); setEditing(true); }} aria-label="Renombrar"><Icon name="pencil" size={14} /></button>
        </TooltipSimple>
        <TooltipSimple content="Eliminar" side="top">
          <button className="flex h-6 w-6 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-primary) hover:text-[#C62828] transition-colors" onClick={remove} aria-label="Eliminar">✕</button>
        </TooltipSimple>
      </span>
    </div>
  );
}