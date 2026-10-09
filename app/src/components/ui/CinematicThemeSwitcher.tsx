import { useCallback, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/hooks/useTheme";

/**
 * Properties for the {@link CinematicThemeSwitcher} component.
 */
export interface CinematicThemeSwitcherProps {
  /** Current active theme. */
  theme: Theme;
  /** Called when the user requests a theme change. */
  onToggle: () => void;
  /** Additional classes applied to the trigger button. */
  className?: string;
}

/**
 * Ripple origin in viewport coordinates.
 */
interface RippleOrigin {
  /** Horizontal viewport coordinate. */
  x: number;
  /** Vertical viewport coordinate. */
  y: number;
  /** Theme that will be revealed by the ripple. */
  next: Theme;
}

/**
 * Cinematic theme switcher with a circular reveal.
 *
 * Keeps the same 36px footprint as the previous TopBar button while
 * adding a sun-to-moon morph and a full-screen circular wipe tinted
 * with Creeky accent variables.
 */
export function CinematicThemeSwitcher({ theme, onToggle, className = "" }: CinematicThemeSwitcherProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [ripple, setRipple] = useState<RippleOrigin | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const handlePress = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const next: Theme = theme === "dark" ? "light" : "dark";
      if (reduceMotion) {
        onToggle();
        return;
      }
      clearTimers();
      setRipple({ x: event.clientX, y: event.clientY, next });
      timers.current.push(
        setTimeout(() => onToggle(), 200),
        setTimeout(() => setRipple(null), 750),
      );
    },
    [theme, onToggle, reduceMotion, clearTimers],
  );

  const isDark = theme === "dark";

  return (
    <>
      <motion.button
        type="button"
        onClick={handlePress}
        aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        title={isDark ? "Tema claro" : "Tema oscuro"}
        whileTap={reduceMotion ? undefined : { scale: 0.88 }}
        transition={{ type: "spring", stiffness: 520, damping: 20 }}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border transition-colors",
          isDark
            ? "border-(--border-medium) bg-[#0a0a0f] text-[#f0f0f5] hover:border-(--accent) hover:text-white"
            : "border-(--border-medium) bg-(--bg-tertiary) text-(--text-soft) hover:border-(--accent) hover:text-(--accent)",
          className,
        )}
        style={{
          boxShadow: isDark
            ? "0 0 18px rgba(94,70,138,0.55), inset 0 0 8px rgba(94,70,138,0.35)"
            : "0 0 14px rgba(128,96,179,0.30), inset 0 0 8px rgba(152,201,28,0.18)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background: isDark
              ? "radial-gradient(80% 80% at 50% 120%, rgba(94,70,138,0.5) 0%, transparent 70%)"
              : "radial-gradient(80% 80% at 50% -20%, rgba(152,201,28,0.35) 0%, transparent 70%)",
          }}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={reduceMotion ? undefined : { rotate: -120, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={reduceMotion ? undefined : { rotate: 120, scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="relative flex items-center justify-center"
          >
            {isDark ? <Moon className="h-5 w-5" aria-hidden /> : <Sun className="h-5 w-5" aria-hidden />}
          </motion.span>
        </AnimatePresence>
        {isDark ? (
          <span aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute left-1.5 top-1.5 h-0.5 w-0.5 rounded-full bg-white/80" />
            <span className="absolute right-2 top-2.5 h-0.5 w-0.5 rounded-full bg-white/50" />
            <span className="absolute bottom-2 left-2.5 h-0.5 w-0.5 rounded-full bg-white/60" />
          </span>
        ) : null}
      </motion.button>
      <AnimatePresence>
        {ripple ? (
          <motion.span
            key="cinematic-wipe"
            aria-hidden
            className="pointer-events-none fixed z-[80] rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 24,
              height: 24,
              x: "-50%",
              y: "-50%",
              background:
                ripple.next === "dark"
                  ? "radial-gradient(circle, #0a0a0f 0%, rgba(94,70,138,0.85) 55%, rgba(94,70,138,0.25) 75%, transparent 100%)"
                  : "radial-gradient(circle, #ffffff 0%, rgba(128,96,179,0.45) 55%, rgba(152,201,28,0.25) 75%, transparent 100%)",
            }}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 160, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
