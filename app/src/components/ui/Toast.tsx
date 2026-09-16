import type { ToastItem } from "@/hooks/useToast";

/**
 * Toast component that displays a list of toast notifications in the bottom-right corner of the screen.
 * @param toasts - An array of toast items to display.
 * @param onDismiss - A callback function that is called when a toast is dismissed.
 */
export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-500 flex flex-col gap-2" aria-live="polite" aria-atomic="true">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg border bg-(--bg-primary) px-4 py-3 shadow-lg min-w-70 max-w-100 animate-[slideInRight_0.25s_ease] border-l-4 ${
            t.type === "success" ? "border-l-[#2E7D32]" : t.type === "error" ? "border-l-[#C62828]" : t.type === "warning" ? "border-l-[#F57F17]" : "border-l-(--accent)"
          } border-y-(--border-medium) border-r-(--border-medium)`}
        >
          <span className="flex-1 text-sm text-(--text)">{t.message}</span>
          <button className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) transition-colors" onClick={() => onDismiss(t.id)} aria-label="Cerrar">✕</button>
        </div>
      ))}
    </div>
  );
}