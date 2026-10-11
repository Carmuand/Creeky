import { VscChromeMinimize, VscChromeClose } from "react-icons/vsc";
import { windowApi } from "@/services/api";
import { useI18n } from "@/i18n";

/**
 * Properties for the {@link TitleBar} component.
 */
interface TitleBarProps {
  /** Application name displayed beside the logo. @default "Creeky" */
  title?: string;
  /** Whether the bridge connection is ready (enables window controls). @default false */
  bridgeReady?: boolean;
}

/**
 * Custom frameless window title bar.
 *
 * @param props - Component properties.
 * @returns The draggable title bar with window controls.
 */
export function TitleBar({
  title = "Creeky",
  bridgeReady = false,
}: TitleBarProps) {
  const { t } = useI18n();
  const handleMinimize = () => {
    if (bridgeReady) void windowApi.minimizeWindow().catch(() => {});
  };
  const handleClose = () => {
    if (bridgeReady) void windowApi.closeWindow().catch(() => {});
  };

  return (
    <header className="pywebview-drag-region h-10 px-3.5 flex items-center justify-between bg-(--bg) border-b border-(--border) select-none shrink-0" style={{ zIndex: 50, position: "relative" }}>
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

      <div className="flex items-center gap-0.5">
        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--text-tertiary) hover:bg-(--bg-hover) hover:text-(--text-primary) disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label={t("window.minimize")}
          disabled={!bridgeReady}
          onClick={handleMinimize}
        >
          <VscChromeMinimize size={13} />
        </button>

        <button
          className="flex h-7 w-7 items-center justify-center rounded text-(--text-tertiary) hover:bg-red-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label={t("window.close")}
          disabled={!bridgeReady}
          onClick={handleClose}
        >
          <VscChromeClose size={13} />
        </button>
      </div>
    </header>
  );
}