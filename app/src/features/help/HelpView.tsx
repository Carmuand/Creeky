import { useState, useMemo } from "react";
import { Input } from "@/components/ui/Input";

const ITEMS: [string, string][] = [
  ["Primeros pasos", "Crea listas con color y emoji, añade tareas con fecha y márcalas. Todo se guarda solo."],
  ["Atajos", "Ctrl+K buscar • Tablero para arrastrar tareas entre listas • chips para filtrar cada sección."],
  ["Segmentos", "Hoy, Semana y Buzón crean tareas sin lista, con fecha, hora, repetición, avisos y etiquetas."],
  ["Programar", "En cada tarea: Hoy/Mañana/Semana, hora, duración, repetir L-D y aviso previo."],
  ["Choques", "Dos tareas no pueden ocupar la misma franja de hora: la app bloquea y avisa."],
  ["Filosofía Creeky", "Como un arroyo: flujo continuo, sin ruido. Monocromo salvo tus listas."],
  ["Privacidad", "Sin cuentas reales ni nube: tus datos no salen de tu PC."],
  ["Colores y emojis", "Cada lista tiene su color y su emoji, y pinta sus tareas en el Calendario y la agenda."],
  ["FAQ", "¿Se borra al limpiar el navegador? Sí. Exporta tu JSON en Sincronización."],
];

export function HelpView() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    if (!lq) return ITEMS;
    return ITEMS.filter(([t, d]) => `${t} ${d}`.toLowerCase().includes(lq));
  }, [q]);

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label="Ayuda">
      <p className="text-sm text-(--muted)">Todo para dominar Creeky.</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">Filtrar:</span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. calendario, pomodoro…" className="max-w-70" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {filtered.map(([t, d], i) => (
          <div key={t} className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-5 shadow-sm">
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent) text-xs font-bold text-white">{String(i + 1).padStart(2, "0")}</span>
            <h4 className="mt-1 font-semibold">{t}</h4>
            <p className="mt-1 text-sm text-(--muted)">{d}</p>
          </div>
        ))}
        {!filtered.length ? <p className="col-span-full py-4 text-center text-sm text-(--muted)">Sin resultados.</p> : null}
      </div>
    </section>
  );
}