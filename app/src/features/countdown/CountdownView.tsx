import { useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { todayISO } from "@/utils/date";
import { listColor } from "@/utils/task";
import { db, uid } from "@/services/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { TooltipSimple } from "@/components/ui/Tooltip";

type CountView = "upcoming" | "past" | "all";

export function CountdownView() {
  const { store, refresh } = useCreekyStore();
  const [view, setView] = useState<CountView>("upcoming");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleAdd = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const s = db.load();
    s.countdowns.push({ id: uid("c"), title: title.trim(), date, created: Date.now() });
    db.save(s);
    refresh();
    setTitle("");
    setDate("");
  };

  const handleDelete = (id: string) => {
    const s = db.load();
    s.countdowns = s.countdowns.filter((x) => x.id !== id);
    db.save(s);
    refresh();
  };

  const handleSaveEdit = (id: string) => {
    const t = editTitle.trim();
    if (!t || !editDate) return;
    const s = db.load();
    const c = s.countdowns.find((x) => x.id === id);
    if (!c) return;
    c.title = t;
    c.date = editDate;
    db.save(s);
    refresh();
    setEditing(null);
  };

  const parts = (endMs: number) => {
    const ms = endMs - Date.now();
    if (!(ms > 0)) return { over: true, d: 0, h: 0, m: 0 };
    return { over: false, d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5), m: Math.floor(ms % 36e5 / 6e4) };
  };

  const today = todayISO();
  const filtered = store.countdowns.filter((c) => view === "all" || (view === "past" ? new Date(c.date) < new Date(today) : new Date(c.date) >= new Date(today))).sort((a, b) => (a.date < b.date ? -1 : 1));
  const autoTasks = store.tasks.filter((t) => !t.deleted && !t.done && t.due).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 12);

  const nums = (p: ReturnType<typeof parts>) =>
    p.over ? (
      <div className="flex justify-center gap-2 my-3"><div className="min-w-15 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-center"><b className="block text-xl">0</b><span className="text-xs uppercase text-(--muted)">vencida</span></div></div>
    ) : p.d > 0 ? (
      <div className="flex justify-center gap-2 my-3"><div className="min-w-15 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-center"><b className="block text-xl">{p.d}</b><span className="text-xs uppercase text-(--muted)">días</span></div><div className="min-w-15 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-center"><b className="block text-xl">{p.h}</b><span className="text-xs uppercase text-(--muted)">horas</span></div></div>
    ) : (
      <div className="flex justify-center gap-2 my-3"><div className="min-w-15 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-center"><b className="block text-xl">{p.h}</b><span className="text-xs uppercase text-(--muted)">horas</span></div><div className="min-w-15 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-2.5 py-2 text-center"><b className="block text-xl">{p.m}</b><span className="text-xs uppercase text-(--muted)">min</span></div></div>
    );

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Cuenta regresiva">
      <p className="text-sm text-(--muted)">Eventos que te motivan: viajes, entregas, metas.</p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-4 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div className="flex flex-1 flex-col gap-1.5 min-w-50"><label className="text-xs font-medium text-(--text-soft)">Evento</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Lanzar Creeky" required /></div>
        <div className="flex flex-col gap-1.5 min-w-40"><label className="text-xs font-medium text-(--text-soft)">Fecha</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div className="flex items-end"><Button type="submit" variant="primary">Crear cuenta atrás</Button></div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {(["upcoming", "past", "all"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`rounded-full border px-3 py-1 text-xs ${view === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>{v === "upcoming" ? "Próximos" : v === "past" ? "Pasados" : "Todos"}</button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {filtered.length ? filtered.map((c) => {
          const p = parts(new Date(`${c.date}T23:59:00`).getTime());
          const total = Math.max(1, Math.ceil((new Date(c.date).getTime() - c.created) / 864e5));
          const done = Math.max(0, Math.min(1, 1 - (new Date(`${c.date}T23:59:00`).getTime() - Date.now()) / (total * 864e5)));
          const isEditing = editing === c.id;
          return (
            <div key={c.id} className="relative flex flex-col items-center rounded-xl border border-(--border-light) bg-(--bg-primary) p-5 text-center shadow-sm">
              <h4 className="font-semibold">{c.title}</h4><div className="text-xs text-(--muted)">Meta: {c.date}</div>
              {!isEditing ? nums(p) : null}
              {!isEditing ? <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-(--bg-tertiary)"><div className="h-full bg-(--accent) transition-all" style={{ width: `${Math.round(done * 100)}%` }} /></div> : null}
              {isEditing ? (
                <div className="mt-3 flex w-full flex-col gap-2">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" />
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  <Button variant="primary" size="sm" onClick={() => handleSaveEdit(c.id)}>Guardar</Button>
                </div>
              ) : null}
              <TooltipSimple content={isEditing ? "Cancelar" : "Editar"} side="top">
                <button onClick={() => { if (isEditing) setEditing(null); else { setEditing(c.id); setEditTitle(c.title); setEditDate(c.date); } }} className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)"><Icon name={isEditing ? "xcirc" : "pencil"} size={15} /></button>
              </TooltipSimple>
              <TooltipSimple content="Eliminar" side="top">
                <button onClick={() => handleDelete(c.id)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-[#C62828]">✕</button>
              </TooltipSimple>
            </div>
          );
        }) : <p className="col-span-full py-4 text-center text-sm text-(--muted)">Nada en esta vista.</p>}
      </div>

      <h3 className="mt-2 text-sm font-semibold">Cuesta atrás automática de tus tareas</h3>
      <p className="text-xs text-(--muted)">Cuánto falta para cada tarea con fecha, pintada con el color de su lista.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {autoTasks.length ? autoTasks.map((t) => {
          const p = parts(new Date(`${t.due}T${t.dueTime || "23:59"}`).getTime());
          const start = t.createdAt || Date.now(), span = Math.max(1, new Date(`${t.due}T${t.dueTime || "23:59"}`).getTime() - start);
          const pct = Math.min(100, Math.max(0, Math.round((1 - (new Date(`${t.due}T${t.dueTime || "23:59"}`).getTime() - Date.now()) / span) * 100)));
          const c = listColor(store, t.list), li = store.lists.find((l) => l.id === t.list);
          return (
            <div key={t.id} className="flex flex-col items-center rounded-xl border border-(--border-light) bg-(--bg-primary) p-5 text-center shadow-sm" style={{ borderTop: `4px solid ${c}` }}>
              <h4 className="font-semibold">{t.title}</h4><div className="text-xs text-(--muted)">{li ? `${li.icon} ${li.name} • ` : ""}{t.due}{t.dueTime ? ` ${t.dueTime}` : ""}</div>
              {nums(p)}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-(--bg-tertiary)"><div className="h-full transition-all" style={{ width: `${pct}%`, background: c }} /></div>
            </div>
          );
        }) : <p className="col-span-full py-4 text-center text-sm text-(--muted)">Pon fecha a una tarea y aparecerá aquí sola.</p>}
      </div>
    </section>
  );
}