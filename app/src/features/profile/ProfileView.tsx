import { useEffect, useMemo, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db } from "@/services/storage";
import { PRIO_META } from "@/types/creeky";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProfileCard } from "@/features/profile/ProfileCard";
import { ProfileEditModal } from "@/features/profile/ProfileEditModal";
import { GoalBars } from "@/features/profile/GoalRings";
import type { GoalBarDatum } from "@/features/profile/GoalRings";
import { PulseCard } from "@/features/profile/PulseCard";
import { ListDonut } from "@/features/profile/ListDonut";
import type { DonutSegment } from "@/features/profile/ListDonut";

export function ProfileView() {
  const { store, refresh } = useCreekyStore();
  const [range, setRange] = useState<"all" | "week">("all");
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const user = useMemo(() => {
    if (!store.session) return null;
    return store.users.find((u) => u.id === store.session) || null;
  }, [store]);

  const weekAgo = Date.now() - 7 * 864e5;
  const alive = useMemo(() => store.tasks.filter((t) => !t.deleted && (range === "all" || (t.createdAt || 0) >= weekAgo)), [store.tasks, range]);
  const done = useMemo(() => alive.filter((t) => t.done).length, [alive]);
  const focusMin = useMemo(() => store.pomoLog.filter((p) => p.mode === "focus" && (range === "all" || (p.ts || 0) >= weekAgo)).reduce((a, p) => a + (p.minutes || 0), 0), [store.pomoLog, range, weekAgo]);

  const priorityRings: GoalBarDatum[] = Object.entries(PRIO_META).map(([value, meta]) => {
    const group = alive.filter((t) => (t.priority || "none") === value);
    const finished = group.filter((t) => t.done).length;
    return {
      id: value,
      label: meta.label,
      detail: `${finished} de ${group.length}`,
      percent: group.length ? (finished / group.length) * 100 : 0,
      color: meta.color,
    };
  });
  const priorityBlended = priorityRings.length
    ? `${(priorityRings.reduce((acc, ring) => acc + ring.percent, 0) / priorityRings.length).toFixed(1)}%`
    : "0.0%";
  const listSegments: DonutSegment[] = store.lists.map((l) => ({
    id: l.id,
    label: l.name,
    value: alive.filter((t) => t.list === l.id).length,
    color: l.color,
  }));

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

  const handleAvatarUpload = (dataUrl: string) => {
    if (!user || !dataUrl) return;
    const s = db.load();
    const full = s.users.find((x) => x.id === user.id);
    if (!full) return;
    full.avatar = dataUrl;
    db.save(s);
    refresh();
  };

  const handleAvatarRemove = () => {
    if (!user) return;
    const s = db.load();
    const full = s.users.find((x) => x.id === user.id);
    if (!full) return;
    delete full.avatar;
    db.save(s);
    refresh();
  };

  if (!user) return <div className="p-6 text-sm text-(--muted)">No hay sesión activa.</div>;

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-labelledby="h-profile">
      <ProfileCard
        name={user.name || "Usuario"}
        email={user.email}
        memberSince={`Miembro desde ${new Date(user.created).toLocaleDateString()}`}
        initial={(user.name || "U")[0].toUpperCase()}
        avatarUrl={user.avatar}
        onAvatarUpload={handleAvatarUpload}
        onAvatarRemove={handleAvatarRemove}
        stats={{ tasks: alive.length, completed: done, focusMinutes: focusMin, habits: store.habits.length }}
        onEdit={() => setEditOpen(true)}
      />
      <ProfileEditModal
        open={editOpen}
        userId={user.id}
        defaultName={user.name || ""}
        defaultEmail={user.email}
        onClose={() => setEditOpen(false)}
        onSaved={refresh}
      />

      <div className="grid grid-cols-2 gap-3 max-[1000px]:grid-cols-1">
        <div className="col-span-2 max-[1000px]:col-span-1">
          <PulseCard />
        </div>
        <ListDonut range={range} onRangeChange={setRange} segments={listSegments} />
        <GoalBars
          range={range}
          onRangeChange={setRange}
          bars={priorityRings}
          footerValue={priorityBlended}
          title="Por prioridad"
          subtitle="Tareas completadas por nivel de prioridad."
          footerLabel="Promedio de completadas"
        />
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