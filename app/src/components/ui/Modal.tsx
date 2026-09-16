import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Properties for the {@link Modal} component.
 */
interface ModalProps {
  /** Controls the visibility state of the modal. */
  open: boolean;
  /** Callback fired when the modal requests to close (via backdrop, escape key, or close button). */
  onClose: () => void;
  /** Width/height utility classes for the modal card container. @default "w-full max-w-lg max-h-[88vh]" */
  className?: string;
  /** The content elements rendered inside the modal. */
  children: ReactNode;
  /** If true, clicking outside the modal content triggers `onClose`. @default true */
  closeOnBackdropClick?: boolean;
}

/**
 * Portal-based modal shell rendered directly into `document.body`.
 */
export function Modal({ open, onClose, className = "w-full max-w-lg max-h-[88vh]", children, closeOnBackdropClick = true }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 animate-[fadeIn_0.18s_ease_both]"
      onClick={closeOnBackdropClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-(--border-medium) bg-(--bg-primary) shadow-2xl animate-[popIn_0.22s_cubic-bezier(0.34,1.56,0.64,1)_both] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Properties for the {@link ModalHeader} component.
 */
interface ModalHeaderProps {
  /** Optional icon rendered in the header badge. */
  icon?: string;
  /** Main title text. */
  title: string;
  /** Optional subtitle displayed beneath the title. */
  subtitle?: string;
  /** Callback fired when the close button is clicked. */
  onClose: () => void;
}

/**
 * Standard modal header with title, optional icon/subtitle, and close button.
 */
export function ModalHeader({ icon, title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-(--border-light) px-6 py-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--border-medium) bg-(--accent-light)">
            <span className="text-[13px] text-(--accent)">{icon}</span>
          </div>
        ) : null}
        <div className="flex flex-col">
          <h2 className="text-[14.5px] font-semibold text-(--text-primary)">{title}</h2>
          {subtitle ? <span className="text-[11px] text-(--text-tertiary)">{subtitle}</span> : null}
        </div>
      </div>
      <button
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-(--border-medium) bg-(--bg-primary) text-(--text-tertiary) transition-colors hover:bg-(--bg-hover) hover:text-(--text-primary) cursor-pointer"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Properties for the {@link ModalBody} component.
 */
interface ModalBodyProps {
  /** Content rendered inside the scrollable body. */
  children: ReactNode;
  /** Additional utility classes for the body container. */
  className?: string;
}

/**
 * Scrollable modal body container.
 */
export function ModalBody({ children, className = "" }: ModalBodyProps) {
  return <div className={`flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-5 ${className}`}>{children}</div>;
}

/**
 * Properties for the {@link ModalFooter} component.
 */
interface ModalFooterProps {
  /** Action elements rendered inside the footer. */
  children: ReactNode;
}

/**
 * Right-aligned footer container for modal actions.
 */
export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="flex shrink-0 items-center justify-end gap-2 border-t border-(--border-light) bg-(--bg-secondary) px-6 py-4">{children}</div>;
}
