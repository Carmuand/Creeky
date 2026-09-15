import type { InputHTMLAttributes } from "react";

/**
 * Properties for the {@link Input} component.
 */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/**
 * Text input with Creeky styling.
 */
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-(--border-medium) bg-(--bg-primary) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) hover:border-(--border-dark) focus:border-(--border-focus) focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}
