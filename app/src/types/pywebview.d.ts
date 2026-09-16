/**
 * pywebview bridge types — event-based (no direct JS eval from Python).
 * Python should emit events via window.__creeky_* globals instead of evaluate_js('someFunc()').
 */

export interface CreekyBridgeApi {
  ping(): Promise<string>;
  minimize_window(): Promise<void>;
  close_window(): Promise<void>;
  // Future: add domain APIs here (tasks, settings, etc.) when desktop exposes them.
}

declare global {
  interface Window {
    pywebview?: {
      api: CreekyBridgeApi;
    };
    // Backend -> frontend events (Python calls window.__creeky_* via evaluate_js, frontend owns handlers)
    __creeky_boot_message?: (payload: { key: string; percent: number; params?: Record<string, string | number> }) => void;
    __creeky_boot_done?: () => void;
    __creeky_toast?: (payload: { message: string; type?: "info" | "success" | "warning" | "error" }) => void;
    __creeky_navigate?: (payload: { view: string }) => void;
    __creeky_sync_status?: (payload: { status: "online" | "syncing" | "offline"; message?: string }) => void;
  }
}

export {};
