import { useEffect, useMemo, useState } from "react";
import { PRIO_META, REMIND_OPTIONS, WEEKDAYS, EMOJI_GRID } from "@/types/creeky";
import type { Task } from "@/types/creeky";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db, registerTags, uid } from "@/services/storage";
import { calcPomodoroBlocks } from "@/utils/pomodoro";
import { findConflict } from "@/utils/task";
import { pushNotification } from "@/utils/notifications";
import { Icon } from "@/components/icons/Icon";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

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
    <Modal open={open} onClose={onClose} className="w-full max-w-140 max-h-[90vh]">
      <ModalHeader title="Nueva tarea" onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
        <ModalBody className="gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Título *</label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="pencil" size={16} /></span>
              <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="¿Qué necesitas hacer?" required autoFocus className="pl-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Lista</label>
              <Select value={form.list} onChange={(v) => update("list", v)} options={snapshot.lists.map((l) => ({ value: l.id, label: `${l.icon} ${l.name}` }))} placeholder="Seleccionar lista" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Prioridad</label>
              <div className="flex gap-2">
                {(["high", "medium", "low", "none"] as const).map((v) => {
                  const isSelected = form.priority === v;
                  const tint: Record<string, string> = { high: "bg-[#fff0f0]", medium: "bg-[#fff8e6]", low: "bg-[#eef7ee]", none: "bg-(--bg-primary)" };
                  return (
                    <button key={v} type="button" onClick={() => update("priority", v)} className={`flex h-12 w-14.5 flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-xs transition-all ${isSelected ? `border-(--accent) shadow-sm -translate-y-0.5 ${tint[v]}` : "border-(--border-light) bg-(--bg-secondary) hover:-translate-y-0.5 hover:shadow-sm hover:border-(--border-medium)"}`}>
                      <span className="text-[15px] font-extrabold leading-none" style={{ color: PRIO_META[v].color }}>{PRIO_META[v].mark}</span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide opacity-90" style={{ color: PRIO_META[v].color }}>{PRIO_META[v].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Descripción</label>
            <Textarea value={form.desc} onChange={(e) => update("desc", e.target.value)} placeholder="Detalles opcionales…" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Fecha</label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="calendar" size={16} /></span>
                <Input type="date" value={form.due} onChange={(e) => update("due", e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Hora</label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="clock" size={16} /></span>
                <Input type="time" value={form.dueTime} onChange={(e) => update("dueTime", e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-[480px]:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Duración</label>
              <Select value={String(form.duration)} onChange={(v) => update("duration", Number(v))} options={[{ value: "15", label: "15 min" }, { value: "30", label: "30 min" }, { value: "45", label: "45 min" }, { value: "60", label: "1 hora" }, { value: "90", label: "1.5 horas" }, { value: "120", label: "2 horas" }]} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-(--text-soft)">Avisar</label>
              <Select value={String(form.remindBefore)} onChange={(v) => update("remindBefore", Number(v))} options={REMIND_OPTIONS.map((o) => ({ value: String(o.v), label: o.label }))} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Repetir días</label>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((w) => (
                <button key={w.v} type="button" onClick={() => setForm((p) => { const n = new Set(p.repeat); if (n.has(w.v)) n.delete(w.v); else n.add(w.v); return { ...p, repeat: n }; })} className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${form.repeat.has(w.v) ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{w.label}</button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-(--text-soft)"><Icon name="timer" size={15} /> Reservar Pomodoro <span className="text-xs font-normal text-(--muted)">(opcional)</span></span>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" checked={form.pomodoro} onChange={(e) => update("pomodoro", e.target.checked)} className="h-4 w-4 rounded border-(--border-medium) text-(--accent) focus:ring-(--accent)" />
              <span className="text-sm text-(--text-soft)">Reservar sesión Pomodoro en esta franja</span>
            </label>
            {pomoPreview ? (
              <div className="rounded-md bg-(--bg-primary) border border-(--border-light) p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {pomoPreview.blocks.map((b, i) => <span key={i} className={`h-3 w-3 rounded-full ${b.type === "focus" ? "bg-(--accent)" : b.type === "shortBreak" ? "bg-(--muted)" : "bg-(--accent-light)"}`} />)}
                  <span className="ml-1 text-xs font-medium text-(--muted)">{pomoPreview.focus} foco{pomoPreview.focus === 1 ? "" : "s"} • {pomoPreview.mins} min</span>
                </div>
                <p className="mt-1.5 text-xs text-(--muted)">La app dividirá la duración en bloques de 25/5/15 min según la duración total.</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Etiquetas</label>
            <div className="relative flex items-center">
              <Input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="trabajo, personal, urgente..." list="tag-options-modal" className="pr-10" />
              <span className="pointer-events-none absolute right-3 flex h-4 w-4 items-center justify-center text-(--muted)"><Icon name="tag" size={16} /></span>
            </div>
            <datalist id="tag-options-modal">{snapshot.tags.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Guardar</Button>
        </ModalFooter>
      </form>
    </Modal>
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
    <Modal open={open} onClose={onClose} className="w-full max-w-130 max-h-[90vh]">
      <ModalHeader title={editing ? "Editar lista" : "Nueva lista"} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">Nombre</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Ej. Trabajo" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">Descripción</label><Input value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} placeholder="Opcional" /></div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Color del tema</label>
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-8 rounded-full border-0 p-0" />
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => <button key={c} type="button" onClick={() => setForm((p) => ({ ...p, color: c }))} className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-black shadow-sm" : "border-transparent"}`} style={{ background: c }} title={c} />)}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Emoji de la lista</label>
            <div className="flex items-center gap-2.5">
              <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-(--bg-secondary) text-2xl">{form.icon}</span>
              <Input value={form.filter} onChange={(e) => setForm((p) => ({ ...p, filter: e.target.value }))} placeholder="Buscar emoji…" className="flex-1" />
            </div>
            <div className="grid max-h-47.5 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-(--border-light) bg-(--bg-secondary) p-2">
              {EMOJI_GRID.map((g) => {
                const q = form.filter.trim().toLowerCase();
                const hit = g.items.filter((e) => !q || e.includes(form.filter.trim()) || g.cat.toLowerCase().includes(q));
                if (!hit.length) return null;
                return (
                  <div key={g.cat} className="contents">
                    <div className="col-span-8 pt-1.5 text-[11px] font-bold uppercase tracking-widest text-(--muted)">{g.cat}</div>
                    {hit.map((e) => <button key={e} type="button" onClick={() => setForm((p) => ({ ...p, icon: e }))} className={`rounded-lg p-1 text-[20px] transition-colors ${e === form.icon ? "bg-(--accent-light) ring-2 ring-(--accent)" : "hover:bg-(--bg-hover)"}`}>{e}</button>)}
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          {editing ? <Button type="button" variant="danger" onClick={handleDelete}>Eliminar</Button> : <span />}
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">{editing ? "Guardar cambios" : "Crear lista"}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export function TagModal({ open, onClose, onToast }: { open: boolean; onClose: () => void; onToast: ToastFn }) {
  const { refresh } = useCreekyStore();
  const [name, setName] = useState("");
  useEffect(() => { if (open) setName(""); }, [open]);
  if (!open) return null;
  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = name.trim().toLowerCase();
    if (!v) return;
    const s = db.load();
    if (s.tags.includes(v)) { onToast(`#${v} ya existe.`, "warning"); return; }
    s.tags.push(v); db.save(s); refresh(); onClose(); onToast(`Etiqueta #${v} creada.`, "success");
  };
  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-105 max-h-[90vh]">
      <ModalHeader title="Nueva etiqueta" onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. urgente" required autoFocus />
            <div className="mt-1 text-xs text-(--muted)">Vista previa: <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-2 py-0.5">#{name.trim().toLowerCase() || "etiqueta"}</span></div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary">Crear</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}