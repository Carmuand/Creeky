import { CreekyIcon } from "@/components/icons/CreekyIcon";

interface SegmentsProps {
  counts: { today: number; week: number; inbox: number };
  onAdd: (preset: { list: string; due: string }) => void;
  todayISO: string;
  weekEndISO: string;
}

export function Segments({ counts, onAdd, todayISO, weekEndISO }: SegmentsProps) {
  return (
    <div className="segments" role="group" aria-label="Captura rápida sin lista">
      <div className="card segment-card">
        <span className="segment-icon"><CreekyIcon name="calendar" size={22} /></span>
        <div><b>Hoy</b><small>Vence hoy • {counts.today}</small></div>
        <button className="btn btn-secondary btn-sm" onClick={() => onAdd({ list: "inbox", due: todayISO })}>+ Nueva</button>
      </div>
      <div className="card segment-card">
        <span className="segment-icon"><CreekyIcon name="calendar" size={22} /></span>
        <div><b>Semana</b><small>Próximos 7 días • {counts.week}</small></div>
        <button className="btn btn-secondary btn-sm" onClick={() => onAdd({ list: "inbox", due: weekEndISO })}>+ Nueva</button>
      </div>
      <div className="card segment-card">
        <span className="segment-icon"><CreekyIcon name="inbox" size={22} /></span>
        <div><b>Buzón de entrada</b><small>Sin fecha • {counts.inbox}</small></div>
        <button className="btn btn-secondary btn-sm" onClick={() => onAdd({ list: "inbox", due: "" })}>+ Nueva</button>
      </div>
    </div>
  );
}
