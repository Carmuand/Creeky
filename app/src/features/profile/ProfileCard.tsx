import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, Mail, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { cn } from "@/lib/utils";

/**
 * Aggregated numbers shown inside the profile card.
 */
export interface ProfileCardStats {
  /** Total visible tasks for the current range. */
  tasks: number;
  /** Completed tasks for the current range. */
  completed: number;
  /** Focus minutes logged for the current range. */
  focusMinutes: number;
  /** Total tracked habits. */
  habits: number;
}

/**
 * Properties for the {@link ProfileCard} component.
 */
export interface ProfileCardProps {
  /** Display name of the user. */
  name: string;
  /** Email address of the user. */
  email: string;
  /** Localized member-since label. */
  memberSince: string;
  /** Single uppercase initial rendered in the avatar. */
  initial: string;
  /** Photo data URL rendered in the avatar. When undefined the initial is shown. */
  avatarUrl?: string;
  /** Called with the new photo data URL picked from the avatar menu. */
  onAvatarUpload?: (dataUrl: string) => void;
  /** Called when the photo is removed from the avatar menu. */
  onAvatarRemove?: () => void;
  /** Stats rendered in the footer grid. */
  stats: ProfileCardStats;
  /** Called when the edit action is triggered. */
  onEdit: () => void;
  /** Additional classes applied to the outer wrapper. */
  className?: string;
}

/**
 * Animated profile card using the Creeky palette.
 *
 * Renders an accent glow frame with reduced-motion support and
 * keeps every color bound to CSS variables so light and dark
 * themes stay monochrome with violet and lime accents.
 */
export function ProfileCard({ name, email, memberSince, initial, avatarUrl, onAvatarUpload, onAvatarRemove, stats, onEdit, className = "" }: ProfileCardProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const entries: Array<{ key: string; value: number; label: string }> = [
    { key: "tasks", value: stats.tasks, label: "Tareas" },
    { key: "completed", value: stats.completed, label: "Completadas" },
    { key: "focusMinutes", value: stats.focusMinutes, label: "Min. de foco" },
    { key: "habits", value: stats.habits, label: "Hábitos" },
  ];

  return (
    <motion.section
      aria-labelledby="h-profile"
      initial={reduceMotion ? undefined : { opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className={cn("relative rounded-2xl p-px", className)}
      style={{
        background: "linear-gradient(135deg, var(--accent) 0%, var(--secondary) 45%, var(--accent) 100%)",
        backgroundSize: "220% 220%",
        boxShadow: "0 10px 30px -12px var(--accent-border), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-2xl opacity-40 blur-lg"
        style={{ background: "linear-gradient(135deg, var(--accent-light), var(--secondary-light), var(--accent-light))" }}
        animate={reduceMotion ? undefined : { opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-(--border-light) bg-(--bg-primary)">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70" style={{ background: "radial-gradient(60% 100% at 20% 0%, var(--accent-light) 0%, transparent 70%), radial-gradient(50% 100% at 85% 0%, var(--secondary-light) 0%, transparent 70%)" }} />
        <div className="relative flex items-center gap-5 p-6 max-[600px]:flex-col max-[600px]:items-start">
          <ProfileAvatar
            name={name}
            initial={initial}
            imageUrl={avatarUrl}
            onUpload={onAvatarUpload ?? (() => undefined)}
            onRemove={onAvatarRemove ?? (() => undefined)}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-(--muted)">Perfil</p>
            <h2 id="h-profile" className="truncate text-xl font-semibold text-(--text-primary)">{name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--muted)">
              <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{email}</span></span>
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />{memberSince}</span>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onEdit} className="shrink-0">
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Editar
          </Button>
        </div>
        <dl className="relative grid grid-cols-4 gap-px border-t border-(--border-light) bg-(--border-light) max-[600px]:grid-cols-2">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.key}
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + index * 0.06 }}
              className="bg-(--bg-primary) px-4 py-3 text-center"
            >
              <dd className="text-xl font-bold text-(--text-primary)">{entry.value}</dd>
              <dt className="text-xs text-(--muted)">{entry.label}</dt>
            </motion.div>
          ))}
        </dl>
      </div>
    </motion.section>
  );
}
