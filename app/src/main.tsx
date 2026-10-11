import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/index.css";
import App from "@/App";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useI18n } from "@/i18n";

/**
 * Fallback shown when the whole tree fails instead of a blank screen.
 *
 * @returns The fatal error screen with a reload action.
 */
function FatalFallback() {
  const { t } = useI18n();
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-(--bg-secondary) p-6 text-center">
      <p className="text-lg font-semibold text-(--text)">{t("fatal.title")}</p>
      <p className="text-sm text-(--muted)">{t("fatal.text")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md border border-(--accent) bg-(--accent) px-4 py-2 text-sm font-medium text-white hover:bg-(--accent-hover)"
      >
        {t("fatal.reload")}
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
