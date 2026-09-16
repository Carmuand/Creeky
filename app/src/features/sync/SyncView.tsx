import { useMemo, useRef, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { db } from "@/services/storage";
import { todayISO } from "@/utils/date";
import { occursOn } from "@/utils/task";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { APP_VERSION } from "@/types/creeky";

export function SyncView() {
  const { store, refresh } = useCreekyStore();
  const [inspect, setInspect] = useState("tasks");
  const [syncTime, setSyncTime] = useState("ahora mismo");
  const fileRef = useRef<HTMLInputElement>(null);

  const alive = useMemo(() => store.tasks.filter((t) => !t.deleted), [store.tasks]);
  const bytes = useMemo(() => JSON.stringify(store).length, [store]);

  const handleSyncNow = () => {
    setSyncTime(new Date().toLocaleTimeString());
  };

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "creeky-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.prompt("No se pudo descargar. Copia tu respaldo:", JSON.stringify(store).slice(0, 2000));
      console.error(msg);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result));
        if (!data.tasks || !data.lists) throw new Error("formato inválido");
        const keepSession = db.load().session;
        const keepUsers = db.load().users;
        db.save({
          tags: data.tags || ["trabajo", "personal", "urgente"],
          users: data.users || keepUsers,
          session: data.session ?? keepSession,
          tasks: data.tasks,
          lists: data.lists,
          habits: data.habits || [],
          matrix: data.matrix || { q1: [], q2: [], q3: [], q4: [] },
          countdowns: data.countdowns || [],
          pomoLog: data.pomoLog || [],
          notifications: data.notifications || [],
        });
        refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(msg);
      }
    };
    r.readAsText(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleWipe = () => {
    if (confirm("¿Borrar todo?")) {
      localStorage.clear();
      location.reload();
    }
  };

  const preview = useMemo(() => {
    const arr = (store as unknown as Record<string, unknown>)[inspect];
    const count = Array.isArray(arr) ? `${arr.length} elemento(s)` : typeof arr;
    const text = JSON.stringify(arr, null, 2).slice(0, 2000);
    return { count, text };
  }, [store, inspect]);

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Sincronización">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">App personal: todo vive en tu navegador. • Código <b className="font-semibold">v{APP_VERSION}</b></p>
        <Button variant="primary" size="sm" onClick={handleSyncNow}>Sincronizar ahora</Button>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <h3 className="font-semibold">Estado real de tus datos</h3>
        <div className="mt-3 flex flex-col divide-y divide-(--border-light) text-sm">
          <div className="flex justify-between py-2"><span className="text-(--muted)">Listas</span><b>{store.lists.length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">Tareas pendientes</span><b>{alive.filter((t) => !t.done).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">Tareas completadas</span><b>{alive.filter((t) => t.done).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">En papelera</span><b>{store.tasks.filter((t) => t.deleted).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">Vencen hoy</span><b>{alive.filter((t) => !t.done && occursOn(t, todayISO())).length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">Notificaciones sin leer / total</span><b>{store.notifications.filter((n) => n.unread).length} / {store.notifications.length}</b></div>
          <div className="flex justify-between py-2"><span className="text-(--muted)">Tamaño en localStorage</span><b>{(bytes / 1024).toFixed(1)} KB</b></div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-[#2E7D32] shadow-[0_0_0_6px_rgba(46,125,50,0.12)]" />
        <div><b className="text-sm">Al día</b><div className="text-xs text-(--muted)">Última copia: {syncTime} • Almacenamiento: localStorage</div></div>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <h3 className="font-semibold">Exportar</h3><p className="mt-1 text-xs text-(--muted)">Descarga tus datos en JSON. Guárdalo en Descargas o en <code className="rounded bg-(--bg-tertiary) px-1 py-0.5 text-xs">Creeky/backups/</code>.</p>
          <div className="mt-3"><Button variant="secondary" size="sm" onClick={handleExport}>Descargar JSON</Button></div>
        </div>
        <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <h3 className="font-semibold">Importar / Borrar</h3><p className="mt-1 text-xs text-(--muted)">Restaura desde un <code className="rounded bg-(--bg-tertiary) px-1 py-0.5 text-xs">creeky-backup.json</code> o limpia tu espacio.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium hover:bg-(--bg-hover)"><input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />Importar</label>
            <Button variant="danger" size="sm" onClick={handleWipe}>Borrar todo</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <h3 className="font-semibold">Inspeccionar datos</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Ver:</span>
          <div className="min-w-45"><Select value={inspect} onChange={setInspect} options={[{ value: "tasks", label: "Tareas" }, { value: "lists", label: "Listas" }, { value: "habits", label: "Hábitos" }, { value: "countdowns", label: "Cuentas atrás" }, { value: "pomoLog", label: "Sesiones Pomodoro" }, { value: "notifications", label: "Notificaciones" }, { value: "tags", label: "Etiquetas" }]} /></div>
          <span className="text-xs text-(--muted)">{preview.count}</span>
        </div>
        <pre className="mt-3 max-h-55 overflow-auto rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3 text-xs whitespace-pre-wrap wrap-break-word">{preview.text}</pre>
      </div>
    </section>
  );
}