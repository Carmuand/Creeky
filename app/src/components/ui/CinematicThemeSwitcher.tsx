import { useCallback } from "react";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Moon, Sun } from "lucide-react";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n";
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
 * Duration of the circular reveal, in milliseconds.
 */
const REVEAL_DURATION_MS = 520;

/**
 * Class set on the root element while the theme is switching so color
 * transitions do not blend with the reveal.
 */
const SWITCHING_CLASS = "theme-switching";

/**
 * Cinematic theme switcher with a circular reveal.
 *
 * The reveal uses the View Transitions API: the browser snapshots the old
 * theme, the new theme is applied in a single synchronous update, and the
 * new snapshot is uncovered from the pointer position. No overlay element
 * is involved, so the page can never stay covered or tinted when the
 * animation is interrupted. Browsers without the API switch instantly.
 *
 * @param props - Component properties.
 * @returns The theme toggle button.
 */
export function CinematicThemeSwitcher({ theme, onToggle, className = "" }: CinematicThemeSwitcherProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const { t } = useI18n();

  const handlePress = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const root = document.documentElement;
      if (reduceMotion || typeof document.startViewTransition !== "function") {
        onToggle();
        return;
      }
      const x = event.clientX;
      const y = event.clientY;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.classList.add(SWITCHING_CLASS);
      const transition = document.startViewTransition(() => {
        flushSync(() => onToggle());
      });
      transition.ready
        .then(() => {
          root.animate(
            { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
            { duration: REVEAL_DURATION_MS, easing: "cubic-bezier(0.32, 0.72, 0, 1)", pseudoElement: "::view-transition-new(root)" },
          );
        })
        .catch(() => undefined);
      void transition.finished.catch(() => undefined).finally(() => root.classList.remove(SWITCHING_CLASS));
    },
    [onToggle, reduceMotion],
  );

  const isDark = theme === "dark";

  return (
    <TooltipSimple content={isDark ? t("theme.light") : t("theme.dark")} side="bottom">
      <motion.button
        type="button"
        data-tour="theme"
        onClick={handlePress}
        aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
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
    </TooltipSimple>
  );
}
