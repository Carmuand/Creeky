import type { TextareaHTMLAttributes } from "react";

/**
 * Properties for the {@link Textarea} component.
 */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea with Creeky styling.
 */
export function Textarea({ className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full min-h-25 resize-y rounded-md border border-(--border-medium) bg-(--bg-primary) px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) hover:border-(--border-dark) focus:border-(--border-focus) focus:outline-none focus:ring-2 focus:ring-black/5 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
