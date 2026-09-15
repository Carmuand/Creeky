import { VscChromeMinimize, VscChromeClose } from "react-icons/vsc";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { api } from "@/services/api";

const IS_DEV = import.meta.env.DEV;

/**
 * Properties for the {@link TitleBar} component.
 */
interface TitleBarProps {
  /** Application name displayed beside the logo. @default import.meta.env.VITE_APP_NAME ?? "Creeky" */
  title?: string;
  /** Whether the bridge connection is ready (enables window controls). @default false */
  bridgeReady?: boolean;
}

/**
 * Custom frameless window title bar.
 * 
 * Features a drag region (`pywebview-drag-region`), application logo, title, 
 * development-only bridge connection indicator, and window controls (minimize/close).
 *
 * @example
 * ```tsx
 * <TitleBar bridgeReady="{bridgeReady}" title="Creeky"/>
 * ```
 */
export function TitleBar({
  title = import.meta.env.VITE_APP_NAME ?? "Creeky",
  bridgeReady = false,
}: TitleBarProps) {
  const handleMinimize = () => { if (bridgeReady) api.minimizeWindow(); };
  const handleClose = () => { if (bridgeReady) api.closeWindow(); };

  return (
    <header className="pywebview-drag-region h-10 px-3.5 flex items-center justify-between bg-(--bg) border-b border-(--border) select-none shrink-0">
      {/* ── Left: logo + name + status dot ─────────────────────────── */}
      <div className="flex items-center gap-2">
        <img
          src="/assets/app/DevLogo.ico"
          alt={title}
          width={24}
          height={24}
          draggable={false}
          className="shrink-0"
        />

        <span className="text-[12px] font-semibold tracking-widest text-(--text-soft) uppercase">
          {title}
        </span>

        {/* Status dot — development only */}
        {IS_DEV && (
          <TooltipSimple content={bridgeReady ? "Bridge connected" : "Connecting…"} side="bottom" align="center">
            <span
              className={`w-1.25 h-1.25 rounded-full transition-colors duration-400 shrink-0 ${
                bridgeReady ? "bg-(--success)" : "bg-(--muted-3)"
              }`}
            />
          </TooltipSimple>
        )}
      </div>

      {/* ── Right: window controls (excluded from drag region) ──────── */}
      <div className="flex items-center gap-0.5">
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--muted) hover:bg-(--bg-hover) hover:text-(--text) disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Minimize"
          disabled={!bridgeReady}
          onClick={handleMinimize}
        >
          <VscChromeMinimize size={13} />
        </button>

        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--muted) hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Close"
          disabled={!bridgeReady}
          onClick={handleClose}
        >
          <VscChromeClose size={13} />
        </button>
      </div>
    </header>
  );
}