import { lazy, Suspense, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * Ballpit background, code-split so three.js only loads on this screen.
 */
const Ballpit = lazy(() => import("@/components/Ballpit"));

/**
 * Properties for the {@link LoginBackground} component.
 */
export interface LoginBackgroundProps {
  /** Ball palette expressed as hexadecimal numbers. */
  colors: number[];
}

/**
 * Returns true when the browser can provide a WebGL context.
 */
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Ambient gradient glow used when WebGL is unavailable or fails.
 *
 * Uses Creeky CSS variables so it follows the active theme without props.
 * Saturated enough to keep the login styled instead of falling back to white.
 */
function AmbientFallback() {
  const reduceMotion = useReducedMotion() ?? false;
  const blobs = [
    "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
    "radial-gradient(circle, var(--secondary) 0%, transparent 70%)",
    "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
  ];
  const positions = ["left-[-10%] top-[-15%]", "right-[-12%] top-[30%]", "left-[20%] bottom-[-20%]"];
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-gradient-to-br from-(--accent-light) via-transparent to-(--secondary-light)">
      {blobs.map((background, index) => (
        <motion.span
          key={index}
          className={`absolute h-[55vmax] w-[55vmax] rounded-full opacity-25 blur-2xl ${positions[index]}`}
          style={{ background }}
          animate={reduceMotion ? undefined : { x: [0, 40, -30, 0], y: [0, -30, 25, 0] }}
          transition={{ duration: 18 + index * 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/**
 * Login background with graceful degradation.
 *
 * Renders the interactive Ballpit when WebGL is available and falls back
 * to an animated ambient glow otherwise, so the login visuals always apply
 * without ever crashing the app.
 */
export function LoginBackground({ colors }: LoginBackgroundProps) {
  const [supported] = useState(checkWebGLSupport);

  if (!supported) return <AmbientFallback />;

  return (
    <ErrorBoundary fallback={<AmbientFallback />}>
      <Suspense fallback={<AmbientFallback />}>
        <Ballpit colors={colors} count={64} gravity={0.4} followCursor />
      </Suspense>
    </ErrorBoundary>
  );
}
