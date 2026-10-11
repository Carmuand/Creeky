import type { InputHTMLAttributes } from "react";

/**
 * Properties for the {@link Input} component.
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** When true, renders a translucent glass style for blurred backgrounds. */
  glass?: boolean;
}

/**
 * Text input with Creeky styling.
 */
export function Input({ className = "", glass = false, ...props }: InputProps) {
  const tone = glass
    ? "border-(--accent-border) bg-white/70 backdrop-blur-md dark:border-white/15 dark:bg-white/10"
    : "border-(--border-medium) bg-(--bg-primary)";
  return (
    <input
      className={`w-full rounded-md border ${tone} px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) hover:border-(--border-dark) focus:border-(--border-focus) focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}
