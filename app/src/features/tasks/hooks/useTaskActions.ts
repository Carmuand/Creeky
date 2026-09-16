import { db, registerTags, uid } from "@/services/storage";
import { todayISO } from "@/utils/date";
import { calcPomodoroBlocks } from "@/utils/pomodoro";
import { findConflict } from "@/utils/task";
import { pushNotification } from "@/utils/notifications";
import type { Task } from "@/types/creeky";

const PRIO_ORDER: Task["priority"][] = ["none", "low", "medium", "high"];

type ToastFn = (msg: string, type?: "info" | "success" | "warning" | "error") => void;


export function createTaskActions(opts: {
  refresh: () => void;
  toast: ToastFn;
  setFocus: (p: { id: string; title: string } | null) => void;
  closeDetail: (id: string) => void;
}) {
  const { refresh, toast, setFocus, closeDetail } = opts;

  return {
    createInline(title: string, filter: string) {
      const v = title.trim();
      if (!v) return;
      const s = db.load();
      const due = filter === "today" ? todayISO() : "";
      const cand: Task = {
        id: uid("t"),
        title: v,
        description: "",
        list: (["all", "today"].includes(filter) ? "inbox" : filter) as string,
        priority: "none",
        due,
        dueTime: "",
        duration: 30,
        repeat: [],
        remindBefore: 15,
        reminder: "",
        reminded: false,
        quadrant: "",
        pomo: 0,
        pomodoroBlocks: [],
        done: false,
        deleted: false,
        deletedAt: null,
        createdAt: Date.now(),
        tags: [],
      };
      s.tasks.unshift(cand);
      if (due) pushNotification(s, "Calendario", `"${v}" programada ${due}`, "calendar");
      db.save(s);
      refresh();
      toast("Tarea creada en la lista. Visible en Calendario si tiene fecha.", "success");
    },

    toggleDone(id: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.done = !t.done;
      if (t.due) {
        pushNotification(
          s,
          "Calendario",
          t.done ? `"${t.title}" completada — liberada del ${t.due}` : `"${t.title}" reabierta para el ${t.due}`,
          "calendar"
        );
      }
      db.save(s);
      refresh();
      toast(t.done ? "Tarea completada." : "Tarea reabierta.", "info");
    },

    softDelete(id: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      const hadDue = !!t.due;
      t.deleted = true;
      t.deletedAt = Date.now();
      if (hadDue) pushNotification(s, "Calendario", `"${t.title}" eliminada del calendario`, "calendar");
      db.save(s);
      refresh();
      toast("Tarea movida a Eliminadas.", "warning");
    },

    restore(id: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.deleted = false;
      t.deletedAt = null;
      db.save(s);
      refresh();
      toast("Tarea restaurada.", "success");
    },

    permDelete(id: string) {
      const s = db.load();
      s.tasks = s.tasks.filter((x) => x.id !== id);
      db.save(s);
      refresh();
      toast("Tarea eliminada definitivamente.", "info");
    },

    cyclePrio(id: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.priority = PRIO_ORDER[(PRIO_ORDER.indexOf(t.priority) + 1) % PRIO_ORDER.length];
      db.save(s);
      refresh();
    },

    move(id: string, targetList: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      const target = s.lists.find((l) => l.id === targetList);
      t.list = targetList;
      t.deleted = false;
      t.deletedAt = null;
      closeDetail(t.id);
      db.save(s);
      refresh();
      toast(`"${t.title}" movida a ${target ? target.name : targetList}.`, "success");
    },

    toggleRepeat(id: string, day: number) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      t.repeat = t.repeat || [];
      t.repeat = t.repeat.includes(day) ? t.repeat.filter((x) => x !== day) : [...t.repeat, day];
      db.save(s);
      refresh();
      toast(t.repeat.length ? `Repite ${t.repeat.length} día(s) y sale en Calendario.` : "Repetición quitada.", "info");
    },

    reservePomodoro(id: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return;
      const wasEmpty = !Array.isArray(t.pomodoroBlocks) || t.pomodoroBlocks.length === 0;
      if (wasEmpty) {
        t.pomodoroBlocks = calcPomodoroBlocks(t.duration || 30);
        const f = t.pomodoroBlocks.filter((x) => x.type === "focus").length;
        const mins = t.pomodoroBlocks.reduce((a, x) => a + x.duration, 0);
        pushNotification(
          s,
          "Pomodoro reservado",
          `"${t.title}" — ${f} bloques de foco (${mins} min) en franja ${t.due || "sin fecha"} ${t.dueTime || ""}`.trim(),
          "system"
        );
      }
      setFocus({ id: t.id, title: t.title });
      db.save(s);
      refresh();
      const f2 = (t.pomodoroBlocks || []).filter((x) => x.type === "focus").length;
      toast(
        wasEmpty ? `Reserva Pomodoro creada: ${f2} bloques para "${t.title}".` : `Enfoque Pomodoro: "${t.title}" lista.`,
        "success"
      );
    },

    saveDetail(id: string, patch: Partial<Task>) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return false;
      const cand = { ...t, ...patch } as Task;
      const clash = findConflict(s, cand, t.id);
      if (clash) {
        toast(`Choque de horario con "${clash.title}" (${clash.dueTime} +${clash.duration || 30}min). Cambia la hora.`, "error");
        return false;
      }
      Object.assign(t, cand);
      t.reminded = false;
      if (t.due && t.dueTime && (t.remindBefore ?? 0) > 0) {
        const dt = new Date(`${t.due}T${t.dueTime || "09:00"}`);
        dt.setMinutes(dt.getMinutes() - t.remindBefore);
        t.reminder = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      }
      registerTags(s, t.tags);
      closeDetail(t.id);
      db.save(s);
      if (t.reminder)
        pushNotification(s, "Recordatorio", `"${t.title}" — avisa ${t.remindBefore} min antes (${String(t.reminder).replace("T", " ")})`, "reminder");
      if (t.due)
        pushNotification(
          s,
          "Calendario",
          `"${t.title}" programada ${t.due}${t.dueTime ? " " + t.dueTime : ""}${(t.repeat || []).length ? " (repite)" : ""}`,
          "calendar"
        );
      db.save(s);
      refresh();
      toast("Tarea programada: calendario, aviso y prioridad actualizados.", "success");
      return true;
    },

    handleBoardDrop(dragId: string, zone: string) {
      const s = db.load();
      const t = s.tasks.find((x) => x.id === dragId);
      if (!t) return;
      if (zone === "__trash") {
        if (t.deleted) return;
        t.deleted = true;
        t.deletedAt = Date.now();
        db.save(s);
        refresh();
        toast(`"${t.title}" movida a Eliminadas.`, "warning");
      } else if (t.list !== zone || t.deleted) {
        t.list = zone;
        t.deleted = false;
        t.deletedAt = null;
        const target = s.lists.find((l) => l.id === zone);
        db.save(s);
        refresh();
        toast(`"${t.title}" movida a ${target ? target.name : zone}.`, "success");
      }
    },
  };
}