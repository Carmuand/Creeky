import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "@/App";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const stored = localStorage.getItem("creeky-theme") as "light" | "dark" | null;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initial = stored ?? (prefersDark ? "dark" : "light");
document.documentElement.setAttribute("data-theme", initial);
document.documentElement.classList.toggle("dark", initial === "dark");
document.documentElement.style.colorScheme = initial;

/**
 * Fallback shown when the whole tree fails instead of a blank screen.
 */
function FatalFallback() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-(--bg-secondary) p-6 text-center">
      <p className="text-lg font-semibold text-(--text)">Algo salió mal al cargar Creeky.</p>
      <p className="text-sm text-(--muted)">Recarga la app para intentarlo de nuevo.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md border border-(--accent) bg-(--accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-hover)"
      >
        Recargar
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary fallback={<FatalFallback />}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
