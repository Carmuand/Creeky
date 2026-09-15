import { useEffect, useMemo, useState } from "react";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS, EMOJI_GRID } from "@/types/creeky";
import type { Task } from "@/types/creeky";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db, registerTags, uid } from "@/services/storage";
import { calcPomodoroBlocks } from "@/utils/pomodoro";
import { findConflict } from "@/utils/task";
import { pushNotification } from "@/utils/notifications";
import { CreekyIcon } from "@/components/icons/CreekyIcon";

const PALETTE = ["#212121", "#616161", "#3949AB", "#00897B", "#2E7D32", "#B58900", "#C62828", "#6A1B9A", "#EF6C00", "#0277BD"];

type ToastFn = (msg: string, type?: "info" | "success" | "warning" | "error") => void;

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
  preset?: Partial<Pick<Task, "list" | "due">>;
  onToast: ToastFn;
  onCreated?: () => void;
}

interface QuickForm {
  title: string;
  desc: string;
  list: string;
  priority: Task["priority"];
  due: string;
  dueTime: string;
  duration: number;
  remindBefore: number;
  tags: string;
  pomodoro: boolean;
  repeat: Set<number>;
}

export function QuickAddModal({ open, onClose, preset, onToast, onCreated }: QuickAddModalProps) {
  const { refresh } = useCreekyStore();
  const snapshot = useMemo(() => db.load(), [open]);
  const [form, setForm] = useState<QuickForm>({
    title: "",
    desc: "",
    list: preset?.list ?? snapshot.lists[0]?.id ?? "inbox",
    priority: "none",
    due: preset?.due ?? "",
    dueTime: "",
    duration: 30,
    remindBefore: 15,
    tags: "",
    pomodoro: false,
    repeat: new Set(),
  });

  useEffect(() => {
    if (open) {
      setForm({
        title: "",
        desc: "",
        list: preset?.list ?? snapshot.lists[0]?.id ?? "inbox",
        priority: "none",
        due: preset?.due ?? "",
        dueTime: "",
        duration: 30,
        remindBefore: 15,
        tags: "",
        pomodoro: false,
        repeat: new Set(),
      });
    }
  }, [open, preset, snapshot.lists]);

  const update = <K extends keyof QuickForm>(key: K, value: QuickForm[K]) => setForm((p) => ({ ...p, [key]: value }));

  const pomoPreview = useMemo(() => {
    if (!form.pomodoro) return null;
    const blocks = calcPomodoroBlocks(form.duration);
    return { blocks, focus: blocks.filter((b) => b.type === "focus").length, mins: blocks.reduce((a, b) => a + b.duration, 0) };
  }, [form.pomodoro, form.duration]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const s = db.load();
    const tagList = form.tags.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    registerTags(s, tagList);
    const pomodoroBlocks = form.pomodoro ? calcPomodoroBlocks(form.duration) : [];
    const cand: Task = {
      id: uid("t"),
      title,
      description: form.desc.trim(),
      list: form.list,
      priority: form.priority,
      due: form.due,
      dueTime: form.dueTime,
      duration: form.duration,
      repeat: [...form.repeat],
      remindBefore: form.remindBefore,
      reminder: "",
      reminded: false,
      quadrant: "",
      pomo: 0,
      pomodoroBlocks,
      done: false,
      deleted: false,
      deletedAt: null,
      createdAt: Date.now(),
      tags: [...new Set(tagList)],
    };
    const clash = findConflict(s, cand);
    if (clash) {
      onToast(`Esa franja está ocupada por "${clash.title}" (${clash.dueTime}). Elige otra hora.`, "error");
      return;
    }
    if (cand.due && cand.dueTime && (cand.remindBefore ?? 0) > 0) {
      const dt = new Date(`${cand.due}T${cand.dueTime}`);
      dt.setMinutes(dt.getMinutes() - cand.remindBefore);
      cand.reminder = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
    }
    s.tasks.unshift(cand);
    if (cand.reminder) pushNotification(s, "Recordatorio", `"${cand.title}" — avisa ${cand.remindBefore} min antes`, "reminder");
    if (cand.due) pushNotification(s, "Calendario", `"${cand.title}" programada ${cand.due}${cand.dueTime ? ` ${cand.dueTime}` : ""}`, "calendar");
    if (form.pomodoro && pomodoroBlocks.length > 0) {
      const f = pomodoroBlocks.filter((b) => b.type === "focus").length;
      const totalMin = pomodoroBlocks.reduce((a, b) => a + b.duration, 0);
      pushNotification(s, "Pomodoro reservado", `"${cand.title}" — ${f} bloques de foco (${totalMin} min total). Sesión lista para iniciar.`, "system");
    }
    db.save(s);
    refresh();
    onClose();
    onCreated?.();
    onToast("Tarea creada con fecha, hora y aviso.", "success");
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-container task-modal">
        <header className="modal-header"><h2>Nueva tarea</h2><button className="modal-close" onClick={onClose}>×</button></header>
        <form onSubmit={handleSubmit} className="task-form" style={{ padding: "22px 24px 18px" }}>
          <div className="form-group">
            <label className="form-label">Título</label>
            <div className="input-wrapper">
              <span className="input-icon"><CreekyIcon name="pencil" size={16} /></span>
              <input className="form-input" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Qué necesitas hacer…" required autoFocus />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea className="form-textarea" value={form.desc} onChange={(e) => update("desc", e.target.value)} placeholder="Detalles opcionales…" rows={3} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lista</label>
              <div className="select-wrapper">
                <select className="form-select" value={form.list} onChange={(e) => update("list", e.target.value)}>
                  {snapshot.lists.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
                </select>
                <span className="select-arrow" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Duración</label>
              <div className="select-wrapper">
                <select className="form-select" value={form.duration} onChange={(e) => update("duration", Number(e.target.value))}>
                  {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
                <span className="select-arrow" />
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Fecha</label><input type="date" className="form-input" value={form.due} onChange={(e) => update("due", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Hora</label><input type="time" className="form-input" value={form.dueTime} onChange={(e) => update("dueTime", e.target.value)} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Prioridad</label>
            <div className="priority-swatches">
              {(["high", "medium", "low", "none"] as const).map((v) => (
                <button key={v} type="button" className={`priority-swatch ${form.priority === v ? "selected" : ""}`} onClick={() => update("priority", v)}>
                  <span className="mark">{PRIO_META[v].mark}</span><span className="label">{PRIO_META[v].label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Aviso</label>
              <div className="select-wrapper">
                <select className="form-select" value={form.remindBefore} onChange={(e) => update("remindBefore", Number(e.target.value))}>
                  {REMIND_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                <span className="select-arrow" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Etiquetas</label>
              <div className="tags-input-wrapper">
                <input className="form-input" value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="trabajo, personal…" list="tag-options-modal" />
                <span className="tags-icon"><CreekyIcon name="tag" size={16} /></span>
              </div>
              <datalist id="tag-options-modal">{snapshot.tags.map((t) => <option key={t} value={t} />)}</datalist>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Repetir</label>
            <div className="repeat-row">
              {WEEKDAYS.map((w) => (
                <button key={w.v} type="button" className={`day-chip ${form.repeat.has(w.v) ? "on" : ""}`} onClick={() => setForm((p) => { const n = new Set(p.repeat); if (n.has(w.v)) n.delete(w.v); else n.add(w.v); return { ...p, repeat: n }; })}>{w.label}</button>
              ))}
            </div>
          </div>
          <div className="form-group pomodoro-reserve">
            <label className="pomodoro-toggle">
              <input type="checkbox" checked={form.pomodoro} onChange={(e) => update("pomodoro", e.target.checked)} />
              <span className="toggle-slider" />
              <span className="toggle-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="pomodoro-icon"><CreekyIcon name="timer" size={15} /></span>Reservar Pomodoro</span>
            </label>
            {pomoPreview ? (
              <div className="pomodoro-preview">
                <div className="pomodoro-blocks">
                  {pomoPreview.blocks.map((b, i) => <span key={i} className={b.type === "focus" ? "focus" : b.type === "shortBreak" ? "shortbreak" : "longbreak"} />)}
                  <span className="pomo-preview-text">{pomoPreview.focus} foco{pomoPreview.focus === 1 ? "" : "s"} • {pomoPreview.mins} min</span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Crear tarea</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ListForm {
  name: string;
  desc: string;
  color: string;
  icon: string;
  filter: string;
}

export function ListModal({ open, onClose, editId, onToast }: { open: boolean; onClose: () => void; editId: string | null; onToast: ToastFn }) {
  const { refresh } = useCreekyStore();
  const editing = useMemo(() => {
    if (!editId) return null;
    return db.load().lists.find((l) => l.id === editId) ?? null;
  }, [editId, open]);
  const [form, setForm] = useState<ListForm>({ name: "", desc: "", color: "#3949AB", icon: "📋", filter: "" });

  useEffect(() => {
    if (open) setForm({ name: editing?.name ?? "", desc: editing?.description ?? "", color: editing?.color ?? "#3949AB", icon: editing?.icon ?? "📋", filter: "" });
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = form.name.trim();
    if (!n) return;
    const store = db.load();
    if (editing) {
      const l = store.lists.find((x) => x.id === editing.id);
      if (l) { l.name = n; l.description = form.desc.trim(); l.color = form.color; l.icon = form.icon || "📋"; }
      db.save(store); refresh(); onClose(); onToast(`Lista ${l?.icon || ""} "${n}" actualizada.`, "success");
    } else {
      const l = { id: uid("l"), name: n, description: form.desc.trim(), color: form.color, icon: form.icon || "📋" };
      store.lists.push(l); db.save(store); refresh(); onClose(); onToast(`Lista ${l.icon} "${n}" creada.`, "success");
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    const store = db.load();
    const l = store.lists.find((x) => x.id === editing.id);
    if (!l) return;
    const count = store.tasks.filter((t) => t.list === l.id && !t.deleted).length;
    if (!confirm(`¿Eliminar "${l.name}"? Sus ${count} tarea(s) irán a la papelera.`)) return;
    store.tasks.forEach((t) => { if (t.list === l.id && !t.deleted) { t.deleted = true; t.deletedAt = Date.now(); } });
    store.lists = store.lists.filter((x) => x.id !== l.id);
    db.save(store); refresh(); onClose(); onToast(`Lista "${l.name}" eliminada (${count} a papelera).`, "warning");
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: 520 }}>
        <header className="modal-header"><h2>{editing ? "Editar lista" : "Nueva lista"}</h2><button className="modal-close" onClick={onClose}>×</button></header>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Ej. Trabajo" /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} placeholder="Opcional" /></div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} style={{ width: 34, height: 34 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {PALETTE.map((c) => <button key={c} type="button" className={`swatch ${c === form.color ? "sel" : ""}`} style={{ background: c, width: 32, height: 32, borderRadius: "50%", border: c === form.color ? "2px solid #000" : "2px solid transparent" }} onClick={() => setForm((p) => ({ ...p, color: c }))} title={c} />)}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Emoji</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: "1.8rem", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-secondary)", borderRadius: 12 }}>{form.icon}</span>
              <input className="form-input" value={form.filter} onChange={(e) => setForm((p) => ({ ...p, filter: e.target.value }))} placeholder="Buscar emoji…" style={{ flex: 1 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 4, maxHeight: 190, overflowY: "auto", background: "var(--bg-secondary)", padding: 8, borderRadius: 10 }}>
              {EMOJI_GRID.map((g) => {
                const q = form.filter.trim().toLowerCase();
                const hit = g.items.filter((e) => !q || e.includes(form.filter.trim()) || g.cat.toLowerCase().includes(q));
                if (!hit.length) return null;
                return (
                  <div key={g.cat} style={{ display: "contents" }}>
                    <div style={{ gridColumn: "1 / -1", fontSize: ".68rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-tertiary)", paddingTop: 6 }}>{g.cat}</div>
                    {hit.map((e) => <button key={e} type="button" onClick={() => setForm((p) => ({ ...p, icon: e }))} style={{ fontSize: "1.3rem", padding: 4, borderRadius: 8, background: e === form.icon ? "var(--accent-light)" : "transparent", outline: e === form.icon ? "2px solid var(--accent)" : "none" }}>{e}</button>)}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="form-actions">
            {editing ? <button type="button" className="btn btn-danger" onClick={handleDelete}>Eliminar</button> : <span />}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editing ? "Guardar cambios" : "Crear lista"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TagModal({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: ToastFn }) {
  const { refresh } = useCreekyStore();
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(""); }, [open]);
  if (!open) return null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = name.trim().toLowerCase();
    if (!v) return;
    const s = db.load();
    if (s.tags.includes(v)) { onToast(`#${v} ya existe.`, "warning"); return; }
    s.tags.push(v); db.save(s); refresh(); onClose(); onToast(`Etiqueta #${v} creada.`, "success");
  };
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-container" style={{ maxWidth: 420 }}>
        <header className="modal-header"><h2>Nueva etiqueta</h2><button className="modal-close" onClick={onClose}>×</button></header>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. urgente" required autoFocus />
            <div style={{ marginTop: 8, fontSize: ".85rem", color: "var(--text-tertiary)" }}>Vista previa: <span className="tag">#{name.trim().toLowerCase() || "etiqueta"}</span></div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
