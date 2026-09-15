import { bridge } from "./bridge";

export const windowApi = {
  minimizeWindow(): Promise<void> { return bridge().minimize_window(); },
  closeWindow(): Promise<void> { return bridge().close_window(); },
  ping(): Promise<string> { return bridge().ping(); },
};
