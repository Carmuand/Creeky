import { Icon } from "@/components/icons/Icon";

interface SegmentsProps {
  counts: { today: number; week: number; inbox: number };
  onAdd: (preset: { list: string; due: string }) => void;
  todayISO: string;
  weekEndISO: string;
}

export function Segments({ counts, onAdd, todayISO, weekEndISO }: SegmentsProps) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-3 max-[900px]:grid-cols-1" role="group" aria-label="Captura rápida sin lista">
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="calendar" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">Hoy</b><small className="text-xs text-(--muted)">Vence hoy • {counts.today}</small></div>
        <button className="shrink-0 rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium text-(--text) hover:bg-(--bg-hover) transition-colors" onClick={() => onAdd({ list: "inbox", due: todayISO })}>+ Nueva</button>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="calendar" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">Semana</b><small className="text-xs text-(--muted)">Próximos 7 días • {counts.week}</small></div>
        <button className="shrink-0 rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium text-(--text) hover:bg-(--bg-hover) transition-colors" onClick={() => onAdd({ list: "inbox", due: weekEndISO })}>+ Nueva</button>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--bg-tertiary) text-(--accent)"><Icon name="inbox" size={22} /></span>
        <div className="flex-1 min-w-0"><b className="block text-sm font-semibold">Buzón de entrada</b><small className="text-xs text-(--muted)">Sin fecha • {counts.inbox}</small></div>
        <button className="shrink-0 rounded-md border border-(--border-medium) bg-(--bg-tertiary) px-3 py-1.5 text-xs font-medium text-(--text) hover:bg-(--bg-hover) transition-colors" onClick={() => onAdd({ list: "inbox", due: "" })}>+ Nueva</button>
      </div>
    </div>
  );
}
