import { useEffect, useMemo, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db } from "@/services/storage";
import { PRIO_META } from "@/types/creeky";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function ProfileView() {
  const { store, refresh } = useCreekyStore();
  const [range, setRange] = useState<"all" | "week">("all");
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const user = useMemo(() => {
    if (!store.session) return null;
    return store.users.find((u) => u.id === store.session) || null;
  }, [store]);

  const weekAgo = Date.now() - 7 * 864e5;
  const alive = useMemo(() => store.tasks.filter((t) => !t.deleted && (range === "all" || (t.createdAt || 0) >= weekAgo)), [store.tasks, range]);
  const done = useMemo(() => alive.filter((t) => t.done).length, [alive]);
  const focusMin = useMemo(() => store.pomoLog.filter((p) => p.mode === "focus" && (range === "all" || (p.ts || 0) >= weekAgo)).reduce((a, p) => a + (p.minutes || 0), 0), [store.pomoLog, range, weekAgo]);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setIsEditing(false);
    }
  }, [user?.name]);

  const handleSave = () => {
    if (!user) return;
    const s = db.load();
    const full = s.users.find((x) => x.id === user.id);
    if (!full) return;
    full.name = name.trim() || full.name;
    db.save(s);
    refresh();
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (user) setName(user.name || "");
    setIsEditing(false);
  };

  if (!user) return <div className="p-6 text-sm text-(--muted)">No hay sesión activa.</div>;

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-labelledby="h-profile">
      <div className="flex items-center gap-5 rounded-xl border border-(--border-light) bg-(--bg-primary) p-6 shadow-sm">
        <div className="flex h-21 w-21 items-center justify-center rounded-full bg-(--accent) text-3xl font-bold text-white">{(user.name || "U")[0].toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <h2 id="h-profile" className="text-xl font-semibold">{user.name || "Usuario"}</h2>
          <p className="text-sm text-(--muted)">{user.email} • Miembro desde {new Date(user.created).toLocaleDateString()}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setIsEditing(true); setTimeout(() => document.getElementById("pf-name")?.focus(), 0); }}>Editar</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 items-center text-xs font-semibold uppercase tracking-widest text-(--muted)">Estadísticas:</span>
        <button onClick={() => setRange("all")} className={`rounded-full border px-3 py-1 text-xs ${range === "all" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>Todo</button>
        <button onClick={() => setRange("week")} className={`rounded-full border px-3 py-1 text-xs ${range === "week" ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>Últimos 7 días</button>
      </div>

      <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-center shadow-sm"><b className="block text-xl">{alive.length}</b><span className="text-xs text-(--muted)">Tareas</span></div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-center shadow-sm"><b className="block text-xl">{done}</b><span className="text-xs text-(--muted)">Completadas</span></div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-center shadow-sm"><b className="block text-xl">{focusMin}</b><span className="text-xs text-(--muted)">Min. de foco</span></div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-center shadow-sm"><b className="block text-xl">{store.habits.length}</b><span className="text-xs text-(--muted)">Hábitos</span></div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Por lista</h3>
          {store.lists.map((l) => {
            const lt = alive.filter((t) => t.list === l.id);
            return <div key={l.id} className="flex items-center gap-2 border-b border-(--border-light) py-2 text-sm last:border-0"><span className="h-3 w-3 rounded" style={{ background: l.color }} /><span className="flex-1 truncate">{l.name}</span><b className="text-sm">{lt.filter((t) => t.done).length}/{lt.length}</b></div>;
          })}
        </div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Por prioridad</h3>
          {Object.entries(PRIO_META).map(([v, m]) => {
            const n = alive.filter((t) => (t.priority || "none") === v).length;
            return <div key={v} className="flex items-center gap-2 border-b border-(--border-light) py-2 text-sm last:border-0"><span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: m.color }}>{m.mark}</span><span className="flex-1">{m.label}</span><b>{n}</b></div>;
          })}
        </div>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <h3 className="font-semibold">Preferencias</h3>
        <p className="mt-1 text-xs text-(--muted)">Tema monocromo (blanco ↔ negro) por ahora. El color se añadirá después.</p>
        <div className="mt-3 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">Nombre</label><Input id="pf-name" value={name} onChange={(e) => { setName(e.target.value); if (!isEditing) setIsEditing(true); }} onFocus={() => setIsEditing(true)} placeholder="Tu nombre" /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">Vista inicial</label><Select value="Tareas" onChange={() => {}} options={[{ value: "Tareas", label: "Tareas" }, { value: "Calendario", label: "Calendario" }, { value: "Pomodoro", label: "Pomodoro" }]} /></div>
        </div>
        {isEditing ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}