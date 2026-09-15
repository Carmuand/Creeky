import { VscChromeMinimize, VscChromeClose } from "react-icons/vsc";
import { windowApi } from "@/services/api";

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
 * Custom frameless window title bar
 */
export function TitleBar({
  title = import.meta.env.VITE_APP_NAME ?? "Creeky",
  bridgeReady = false,
}: TitleBarProps) {
  const handleMinimize = () => {
    if (bridgeReady) void windowApi.minimizeWindow().catch(() => {});
  };
  const handleClose = () => {
    if (bridgeReady) void windowApi.closeWindow().catch(() => {});
  };

  return (
    <header className="pywebview-drag-region h-10 px-3.5 flex items-center justify-between bg-(--bg-primary) border-b border-(--border-light) select-none shrink-0">
      {/* Left: logo + name */}
      <div className="flex items-center gap-2">
        <img
          src="/assets/app/DevLogo.ico"
          alt={title}
          width={24}
          height={24}
          draggable={false}
          className="shrink-0"
        />
        <span className="text-[12px] font-semibold tracking-widest text-(--text-secondary) uppercase">
          {title}
        </span>
      </div>

      {/* Right: window controls (excluded from drag region) */}
      <div className="flex items-center gap-0.5">
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--text-tertiary) hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Minimize"
          disabled={!bridgeReady}
          onClick={handleMinimize}
        >
          <VscChromeMinimize size={13} />
        </button>

        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--text-tertiary) hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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