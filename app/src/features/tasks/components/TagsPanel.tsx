import { useState } from "react";
import { CreekyIcon } from "@/components/icons/CreekyIcon";
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="panel-sec">
      <div className="panel-sec-head">
        <span className="panel-sec-icon"><CreekyIcon name="tag" size={16} /></span>
        <h3>Etiquetas <span className="panel-count">({tags.length})</span></h3>
        <span className="menu-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn sm" onClick={() => setMenuOpen((v) => !v)} title="Opciones de etiquetas"><CreekyIcon name="gear" size={15} /></button>
          {menuOpen ? (
            <span className="menu-dropdown">
              <button onClick={() => onChangeView({ tagSort: !view.tagSort })}>Ordenar A–Z {view.tagSort ? "✓" : ""}</button>
              <button onClick={handleClean}>Eliminar sin uso</button>
            </span>
          ) : null}
        </span>
        <button className="icon-btn sm" onClick={onNewTag} title="Nueva etiqueta"><CreekyIcon name="plus" size={15} /></button>
      </div>

      <div className="tag-list">
        {visTags.map((t) => (
          <InlineTag key={t} tag={t} activeTag={activeTag} onSetActiveTag={onSetActiveTag} onToast={onToast} onRefresh={onRefresh} />
        ))}
        {!visTags.length ? <p className="text-xs" style={{ color: "var(--text-tertiary)", padding: "0 8px" }}>Sin etiquetas.</p> : null}
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
      <div className="tag-row" style={{ display: "flex", gap: 6 }}>
        <input className="form-input" value={val} onChange={(e) => setVal(e.target.value)} style={{ flex: 1, minWidth: 0 }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
        <button className="btn btn-primary btn-sm" onClick={save}>OK</button>
      </div>
    );
  }

  return (
    <div className="tag-row">
      <span className="tag">#{tag}</span>
      <span className="tag-tools">
        <button className="icon-btn sm" onClick={() => { setVal(tag); setEditing(true); }} title="Renombrar"><CreekyIcon name="pencil" size={14} /></button>
        <button className="task-del sm" onClick={remove} title="Eliminar">✕</button>
      </span>
    </div>
  );
}
