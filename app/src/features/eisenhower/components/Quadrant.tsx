import type { Task, CreekyDB } from "@/types/creeky";
import { PRIO_META } from "@/types/creeky";
import { listColor } from "@/utils/task";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { useState } from "react";

interface QuadrantProps {
  id: "q1" | "q2" | "q3" | "q4";
  title: string;
  desc: string;
  manual: string[];
  auto: Task[];
  store: CreekyDB;
  filterText: string;
  onAddManual: (text: string) => void;
  onDeleteManual: (index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const QP = { q1: "high", q2: "medium", q3: "low", q4: "none" } as const;
const badgeColor: Record<string, string> = { q1: "#000", q2: "#424242", q3: "#9E9E9E", q4: "#E0E0E0" };

/**
 * Single quadrant with manual notes and auto tasks.
 */
export function Quadrant({ id, title, desc, manual, auto, store, filterText, onAddManual, onDeleteManual, onDrop, onDragOver }: QuadrantProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    onAddManual(v);
    setInput("");
  };

  const q = filterText.toLowerCase();
  const visibleManual = manual.filter((t) => !q || t.toLowerCase().includes(q));
  const visibleAuto = auto.filter((t) => !q || t.title.toLowerCase().includes(q) || t.list.toLowerCase().includes(q));

  return (
    <div
      className="flex min-h-65 flex-col overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm"
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-qdrop={id}
    >
      <header className="flex items-center gap-2.5 border-b border-(--border-light) px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: badgeColor[id], color: id === "q4" ? "#616161" : "#fff" }}>{id.toUpperCase()}</span>
        <div className="flex-1 min-w-0">
          <b className="block text-sm">{title}</b><small className="block text-xs text-(--muted)">{desc} • {manual.length + auto.length}</small>
        </div>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: PRIO_META[QP[id]].color }}>{PRIO_META[QP[id]].mark}</span>
      </header>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {visibleManual.map((t, i) => {
          const origIdx = manual.indexOf(t);
          return (
            <div key={`${t}-${i}`} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", `n:${id}:${origIdx}`); e.dataTransfer.effectAllowed = "move"; }} className="flex items-center gap-2 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-3 py-2 text-sm">
              <span className="rounded-full bg-(--bg-tertiary) border border-(--border-light) px-1.5 py-0.5 text-xs">Manual</span> <span className="flex-1 truncate">{t}</span>
              <button onClick={() => onDeleteManual(origIdx)} className="flex h-6 w-6 items-center justify-center rounded-md text-(--muted) hover:bg-(--bg-primary) hover:text-[#C62828]">✕</button>
            </div>
          );
        })}
        {visibleAuto.map((t) => {
          const li = store.lists.find((l) => l.id === t.list);
          return (
            <TooltipSimple key={t.id} content={`Arrastra a otro cuadrante • ${li?.name ?? t.list} • ${t.due || "sin fecha"}`} side="top">
              <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", `t:${t.id}`); e.dataTransfer.effectAllowed = "move"; }} className="flex items-center gap-2 rounded-lg border border-(--border-light) bg-(--bg-primary) px-3 py-2 text-sm hover:border-(--border-dark) hover:shadow-sm cursor-grab active:cursor-grabbing">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: listColor(store, t.list) }} />
                <span className="flex-1 truncate font-medium">{t.title}</span>
                <span className="shrink-0 rounded-full bg-(--bg-tertiary) px-2 py-0.5 text-xs text-(--muted)">{li ? `${li.icon} ${li.name}` : t.list}{t.due ? ` • ${t.due}` : ""}</span>
              </div>
            </TooltipSimple>
          );
        })}
        {!visibleManual.length && !visibleAuto.length ? <p className="py-2 text-center text-xs text-(--muted)">Suelta tareas aquí</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-(--border-light) bg-(--bg-secondary) p-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Añadir nota a ${title}…`} className="flex-1" />
        <Button type="submit" variant="secondary" size="sm">+</Button>
      </form>
    </div>
  );
}