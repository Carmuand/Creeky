/**
 * bridge — same pattern as ZForge: poll until window.pywebview.api.ping is callable.
 * No JS eval from Python; backend emits events via window.__creeky_* globals.
 */
let _bridgeReady = false;

function isBridgeCallable(): boolean {
  return typeof window.pywebview?.api?.ping === "function";
}

export function waitForBridge(timeoutMs = 8_000): Promise<void> {
  if (_bridgeReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (isBridgeCallable()) { _bridgeReady = true; resolve(); return; }
    const POLL_MS = 50;
    let elapsed = 0;
    const timer = window.setInterval(() => {
      if (isBridgeCallable()) { window.clearInterval(timer); _bridgeReady = true; resolve(); return; }
      elapsed += POLL_MS;
      if (elapsed >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error(`[bridge] pywebview did not become ready within ${timeoutMs}ms.`));
      }
    }, POLL_MS);
  });
}

export function bridge(): NonNullable<Window["pywebview"]>["api"] {
  if (!_bridgeReady || !window.pywebview?.api) {
    throw new Error("[bridge] Bridge not ready. Await waitForBridge() first.");
  }
  return window.pywebview.api;
}

export function isBridgeReady(): boolean { return _bridgeReady; }
