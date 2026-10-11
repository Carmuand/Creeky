import type { BridgeResult, CreekyBridgeApi } from "@/types/pywebview";

let bridgeReady = false;
let mutationListener: (() => Promise<void>) | null = null;

/**
 * Error raised when the backend rejects a call. Its message is the
 * stable error code returned by the backend.
 */
export class ApiError extends Error {
  /**
   * @param code - Error code returned by the backend.
   */
  constructor(code: string) {
    super(code);
    this.name = "ApiError";
  }
}

/**
 * Tells whether the pywebview bridge already exposes the backend API.
 *
 * @returns True when backend methods can be called.
 */
function isBridgeCallable(): boolean {
  return typeof window.pywebview?.api?.ping === "function";
}

/**
 * Waits until the pywebview bridge is callable.
 *
 * @param timeoutMs - Maximum time to wait before rejecting.
 * @returns Promise resolved once the bridge is ready.
 */
export function waitForBridge(timeoutMs = 8_000): Promise<void> {
  if (bridgeReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (isBridgeCallable()) { bridgeReady = true; resolve(); return; }
    const POLL_MS = 50;
    let elapsed = 0;
    const timer = window.setInterval(() => {
      if (isBridgeCallable()) { window.clearInterval(timer); bridgeReady = true; resolve(); return; }
      elapsed += POLL_MS;
      if (elapsed >= timeoutMs) {
        window.clearInterval(timer);
        reject(new Error(`[bridge] pywebview did not become ready within ${timeoutMs}ms.`));
      }
    }, POLL_MS);
  });
}

/**
 * Returns the backend API once the bridge is ready.
 *
 * @returns Backend methods exposed by pywebview.
 * @throws Error when called before the bridge is ready.
 */
export function bridge(): CreekyBridgeApi {
  if (!bridgeReady || !window.pywebview?.api) {
    throw new Error("[bridge] Bridge not ready. Await waitForBridge() first.");
  }
  return window.pywebview.api;
}

/**
 * Tells whether the bridge finished initializing.
 *
 * @returns True once `waitForBridge` resolved.
 */
export function isBridgeReady(): boolean { return bridgeReady; }

/**
 * Registers the callback awaited after every successful mutation.
 *
 * @param listener - Callback that reloads the application state.
 */
export function onMutation(listener: () => Promise<void>): void {
  mutationListener = listener;
}

/**
 * Unwraps a backend result envelope.
 *
 * @param result - Promise returned by a bridge method.
 * @returns The data carried by a successful result.
 * @throws ApiError with the backend error code on failure.
 */
export async function query<T>(result: Promise<BridgeResult<T>>): Promise<T> {
  const envelope = await result;
  if (!envelope || !envelope.ok) throw new ApiError(envelope?.error ?? "unexpected");
  return envelope.data;
}

/**
 * Unwraps a backend result and reloads the application state afterwards.
 *
 * @param result - Promise returned by a mutating bridge method.
 * @returns The data carried by a successful result.
 * @throws ApiError with the backend error code on failure.
 */
export async function mutate<T>(result: Promise<BridgeResult<T>>): Promise<T> {
  const data = await query(result);
  if (mutationListener) await mutationListener();
  return data;
}
