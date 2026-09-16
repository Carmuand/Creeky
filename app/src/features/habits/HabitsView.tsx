import { useMemo, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { todayISO, addDaysISO, isoWeekKey, mondayOfWeekKey } from "@/utils/date";
import { db, uid } from "@/services/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import { TooltipSimple } from "@/components/ui/Tooltip";

export function HabitsView() {
  const { store, refresh } = useCreekyStore();
  const [filter, setFilter] = useState<"all" | "active" | "hot" | "fresh">("all");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const monday = mondayOfWeekKey(isoWeekKey(new Date()));
  const sunday = addDaysISO(monday, 6);
  const todayStr = todayISO();
  const monthPrefix = todayStr.slice(0, 7);

  const monthChecks = useMemo(() => store.habits.reduce((a, h) => a + Object.keys(h.history || {}).filter((k) => k.startsWith(monthPrefix)).length + (h.days || []).filter(Boolean).length, 0), [store.habits, monthPrefix]);
  const activeR = useMemo(() => store.habits.filter((h) => (h.streak || 0) > 0).length, [store.habits]);
  const bestAll = useMemo(() => Math.max(0, ...store.habits.map((h) => h.best || 0)), [store.habits]);

  const fmtR = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "short" }); };

  const handleAdd = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = newName.trim();
    if (!v) return;
    const s = db.load();
    s.habits.push({ id: uid("h"), name: v, streak: 0, best: 0, days: [0, 0, 0, 0, 0, 0, 0], history: {}, week: isoWeekKey(new Date()), notify: true, notifyTime: "09:00", lastPing: "" });
    db.save(s);
    refresh();
    setNewName("");
  };

  const toggleDay = (id: string, idx: number) => {
    const s = db.load();
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    const v = (h.days || [])[idx] ? 0 : 1;
    h.days[idx] = v;
    h.history = h.history || {};
    const iso = addDaysISO(monday, idx);
    if (v) h.history[iso] = 1;
    else delete h.history[iso];
    const calcStreak = (hh: typeof h) => {
      const done = new Set(Object.entries(hh.history || {}).filter(([, vv]) => vv).map(([k]) => k));
      const mon = mondayOfWeekKey(hh.week || isoWeekKey(new Date()));
      (hh.days || []).forEach((d, i) => { if (d) done.add(addDaysISO(mon, i)); });
      let d = todayISO();
      if (!done.has(d)) d = addDaysISO(d, -1);
      let n = 0;
      while (done.has(d)) { n++; d = addDaysISO(d, -1); }
      return n;
    };
    h.streak = calcStreak(h);
    h.best = Math.max(h.best || 0, h.streak);
    db.save(s);
    refresh();
  };

  const toggleNotify = (id: string) => {
    const s = db.load();
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    h.notify = !h.notify;
    if (h.notify) h.lastPing = "";
    db.save(s);
    refresh();
  };

  const changeTime = (id: string, t: string) => {
    const s = db.load();
    const h = s.habits.find((x) => x.id === id);
    if (!h || !t) return;
    h.notifyTime = t;
    h.lastPing = "";
    db.save(s);
    refresh();
  };

  const remove = (id: string) => {
    const s = db.load();
    s.habits = s.habits.filter((x) => x.id !== id);
    db.save(s);
    refresh();
  };

  const saveEdit = (id: string) => {
    const v = editVal.trim();
    if (!v) return;
    const s = db.load();
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    h.name = v;
    db.save(s);
    refresh();
    setEditing(null);
  };

  const filtered = store.habits.filter((h) => {
    const st = h.streak || 0;
    if (filter === "active") return st > 0;
    if (filter === "hot") return st >= 5;
    if (filter === "fresh") return st === 0;
    return true;
  });

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Hábitos">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-(--muted)">Marca cada día. Al cambiar de semana se archiva sola y la racha continúa.</p>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuevo hábito…" className="min-w-50" />
          <Button type="submit" variant="primary">+</Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 text-sm">
        <span>Rachas activas <b className="text-base">{activeR}</b></span>
        <span>Checks este mes <b className="text-base">{monthChecks}</b></span>
        <span>Mejor racha <b className="text-base">{bestAll}</b></span>
        <span className="ml-auto text-xs text-(--muted)">Semana del {fmtR(monday)} al {fmtR(sunday)}</span>
      </div>

      <p className="px-1 text-sm text-(--muted)">La racha cuenta días consecutivos hasta hoy (los futuros no suman y están bloqueados). Cada lunes la semana se archiva y los checks se reinician <b className="font-semibold">sin perder la racha</b> mientras no falles un día.</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Ver:</span>
        {(["all", "active", "hot", "fresh"] as const).map((v) => (
          <button key={v} onClick={() => setFilter(v)} className={`rounded-full border px-3 py-1 text-xs ${filter === v ? "bg-(--accent) border-(--accent) text-white font-semibold" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent)"}`}>
            {v === "all" ? `Todos (${store.habits.length})` : v === "active" ? "Activos" : v === "hot" ? "Racha ≥ 5" : "Sin empezar"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-(--border-light) text-center">
              <th className="px-2 py-2 text-left font-semibold">Hábito</th>
              {["L", "M", "X", "J", "V", "S", "D"].map((c, i) => {
                const iso = addDaysISO(monday, i);
                return <th key={c} title={iso} className="px-2 py-2 font-semibold">{c}<br /><small className="font-normal text-(--muted)">{Number(iso.slice(8))}</small></th>;
              })}
              <th className="px-2 py-2 font-semibold">Racha</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h) => (
              <tr key={h.id} className="border-b border-(--border-light) text-center last:border-0">
                <td className="px-2 py-2 text-left">
                  {editing === h.id ? (
                    <span className="flex gap-1.5"><Input value={editVal} onChange={(e) => setEditVal(e.target.value)} className="flex-1" autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveEdit(h.id); }} /><Button variant="primary" size="sm" onClick={() => saveEdit(h.id)}>OK</Button></span>
                  ) : (
                    <span className="font-medium">{h.name}</span>
                  )}
                  <br />
                  <span className="mt-1 inline-flex items-center gap-1">
                    <TooltipSimple content="Recordatorio diario" side="top">
                      <button onClick={() => toggleNotify(h.id)} className={`flex h-6 w-6 items-center justify-center rounded-md ${h.notify ? "bg-(--accent-light) text-(--accent)" : "text-(--muted) hover:bg-(--bg-hover)"}`}><Icon name="bell" size={13} /></button>
                    </TooltipSimple>
                    <input type="time" value={h.notifyTime || "09:00"} onChange={(e) => changeTime(h.id, e.target.value)} className="rounded-md border border-(--border-medium) bg-(--bg-primary) px-1.5 py-1 text-xs" title="Hora del recordatorio" />
                  </span>
                </td>
                {h.days.map((d, i) => {
                  const iso = addDaysISO(monday, i);
                  const future = iso > todayStr;
                  return (
                    <td key={i} className="px-1 py-2 text-center">
                      <TooltipSimple content={future ? "Este día aún no llega" : `Marcar ${iso}`} side="top">
                        <button disabled={future} onClick={() => toggleDay(h.id, i)} className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${d ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-transparent hover:border-(--accent)"} ${future ? "opacity-25 cursor-not-allowed" : ""}`}>{d ? "✓" : ""}</button>
                      </TooltipSimple>
                    </td>
                  );
                })}
                <td className="px-2 py-2">
                  <span className="inline-flex items-center gap-1 text-xs" title={`Mejor racha: ${h.best || 0}`}><Icon name="zap" size={14} /> {h.streak}</span>
                  <div className="text-xs text-(--muted)">mejor {h.best || 0}</div>
                </td>
                <td className="whitespace-nowrap px-2 py-2">
                  <span className="flex gap-1">
                    <TooltipSimple content="Editar nombre" side="top"><button onClick={() => { setEditing(h.id); setEditVal(h.name); }} className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-(--text)"><Icon name="pencil" size={14} /></button></TooltipSimple>
                    <TooltipSimple content="Eliminar" side="top"><button onClick={() => remove(h.id)} className="flex h-7 w-7 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-hover) hover:text-[#C62828]">✕</button></TooltipSimple>
                  </span>
                </td>
              </tr>
            ))}
            {!filtered.length ? <tr><td colSpan={10} className="py-6 text-center text-sm text-(--muted)">Nada en esta vista.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}