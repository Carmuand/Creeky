import { useEffect, useRef } from "react";
import { db } from "@/services/storage";
import { todayISO } from "@/utils/date";

/**
 * useReminders — polls tasks/habits for due reminders every 30s.
 * Creates notifications in storage and triggers toast/refresh.
 */
export function useReminders(opts: {
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
  onRefresh: () => void;
}) {
  const cbRef = useRef(opts);
  cbRef.current = opts;

  useEffect(() => {
    const check = () => {
      const s = db.load();
      let changed = false;
      let habitPing = false;
      const now = new Date();

      s.tasks.forEach((t) => {
        if (t.deleted || t.done || t.reminded || !t.reminder) return;
        if (new Date(t.reminder) <= now) {
          t.reminded = true;
          changed = true;
          s.notifications.unshift({
            id: `n_${Math.random().toString(36).slice(2, 8)}`,
            title: "¡Es hora!",
            text: `"${t.title}" — era para ${t.due || ""} ${t.dueTime || ""}`.trim(),
            time: new Date().toLocaleString(),
            unread: true,
            kind: "reminder",
          });
        }
      });

      const tISO = todayISO();
      const idx = (now.getDay() + 6) % 7;
      const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      (s.habits || []).forEach((h) => {
        if (!h.notify || h.lastPing === tISO) return;
        if ((h.days || [])[idx]) return;
        if (hm < (h.notifyTime || "09:00")) return;
        h.lastPing = tISO;
        changed = true;
        habitPing = true;
        s.notifications.unshift({
          id: `n_${Math.random().toString(36).slice(2, 8)}`,
          title: `Completa tu hábito: ${h.name}`,
          text: `Racha de ${h.streak || 0} en juego. Márcalo hoy para no perderla.`,
          time: new Date().toLocaleString(),
          unread: true,
          kind: "reminder",
        });
      });

      if (changed) {
        db.save(s);
        cbRef.current.onRefresh();
        const hash = window.location.hash || "";
        const isNotifOrHabit = hash === "#notifications" || hash === "#habits";
        if (!isNotifOrHabit) {
          cbRef.current.onToast(
            habitPing ? "Tienes hábitos por completar hoy. Míralos en Notificaciones." : "Tienes una alarma vencida. Mírala en Notificaciones.",
            "warning"
          );
        }
      }
    };

    const id = window.setInterval(check, 30000);
    const t = window.setTimeout(check, 3000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t);
    };
  }, []);
}
