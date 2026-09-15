import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/**
 * Properties for the {@link Button} component.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style of the button. @default "primary" */
  variant?: ButtonVariant;
  /** Size of the button. @default "md" */
  size?: ButtonSize;
  /** When true, the button expands to full width. */
  block?: boolean;
  /** Button content. */
  children: ReactNode;
}

/**
 * Button with Creeky grayscale palette.
 */
export function Button({ variant = "primary", size = "md", block = false, className = "", children, disabled, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-(--accent) text-white border border-(--accent) hover:bg-(--accent-hover) hover:border-(--accent-hover)",
    secondary: "bg-(--bg-tertiary) text-(--text-primary) border border-(--border-medium) hover:bg-(--bg-hover) hover:border-(--border-dark)",
    ghost: "bg-transparent text-(--text-soft) hover:bg-(--bg-hover) hover:text-(--text)",
    danger: "bg-(--bg-tertiary) text-[#C62828] border border-[rgba(198,40,40,0.2)] hover:bg-[rgba(198,40,40,0.08)] hover:border-[#C62828]",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""} ${className}`} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
