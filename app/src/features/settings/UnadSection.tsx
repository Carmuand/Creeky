import { useState } from "react";
import { GraduationCap, Link2, RefreshCw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { DeleteButton } from "@/components/ui/delete-button";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { unadApi } from "@/services/api";

/**
 * Document types accepted by the campus sign-in.
 */
const DOCUMENT_TYPES = ["CC", "TI", "CE", "PA"];

/**
 * Sync intervals offered, in minutes.
 */
const INTERVALS = [5, 15, 30, 60, 180, 360, 720];

/**
 * UNAD section of the settings view. It links the UNAD Campus account of
 * the user: the backend verifies the credentials by signing in, keeps the
 * password in the Windows Credential Manager and starts the service that
 * syncs the profile and the followed course agendas into the calendar.
 *
 * @returns The UNAD settings section.
 */
export function UnadSection() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const { connected, account, profile, agendas } = store.unad;
  const [documentType, setDocumentType] = useState("CC");
  const [documentId, setDocumentId] = useState("");
  const [password, setPassword] = useState("");
  const [agendaUrl, setAgendaUrl] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "agenda" | null>(null);
  const [formError, setFormError] = useState("");

  const report = (error: unknown) => pushToast(errorMessage(error), "error");

  const handleConnect = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy("connect");
    setFormError("");
    try {
      await unadApi.connect(documentType, documentId.trim(), password);
      setPassword("");
      pushToast(t("unad.toast.connected"), "success");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    if (busy) return;
    setBusy("sync");
    try {
      const result = await unadApi.syncNow();
      if (result.error) pushToast(errorMessage(new Error(result.error)), "warning");
      else pushToast(t("unad.toast.synced", { count: result.agendas }), "success");
    } catch (error) {
      report(error);
    } finally {
      setBusy(null);
    }
  };

  const handleAddAgenda = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || !agendaUrl.trim()) return;
    setBusy("agenda");
    try {
      const agenda = await unadApi.addAgenda(agendaUrl.trim());
      setAgendaUrl("");
      pushToast(t("unad.toast.agendaAdded", { name: agenda.name || agenda.code, count: agenda.activities.length }), "success");
    } catch (error) {
      report(error);
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = () => {
    unadApi.disconnect().then(() => pushToast(t("unad.toast.disconnected"), "info")).catch(report);
  };

  if (!connected || !account) {
    return (
      <div role="tabpanel" className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><GraduationCap className="h-5 w-5" /></span>
          <div>
            <h3 className="font-semibold">{t("unad.connect.title")}</h3>
            <p className="mt-0.5 text-xs text-(--muted)">{t("unad.connect.text")}</p>
          </div>
        </div>
        {formError ? <div role="alert" className="mt-3 rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">{formError}</div> : null}
        <form onSubmit={(e) => { void handleConnect(e); }} className="mt-4 grid grid-cols-[120px_1fr_1fr] gap-3 max-[700px]:grid-cols-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-(--text-soft)">{t("unad.field.documentType")}</label>
            <Select value={documentType} onChange={setDocumentType} options={DOCUMENT_TYPES.map((type) => ({ value: type, label: type }))} />
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
            {t("unad.field.document")}
            <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} inputMode="numeric" autoComplete="off" required placeholder="1234567890" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
            {t("unad.field.password")}
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" required placeholder="••••••••" />
          </label>
          <div className="col-span-3 flex flex-wrap items-center justify-between gap-3 max-[700px]:col-span-1">
            <p className="max-w-130 text-[11px] text-(--muted)">{t("unad.connect.privacy")}</p>
            <Button type="submit" variant="primary" disabled={busy !== null}>
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              {busy === "connect" ? t("unad.connect.verifying") : t("unad.connect.submit")}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const errorKey = `error.${account.lastError}` as MessageKey;
  const lastSync = account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString(locale) : t("unad.status.never");

  return (
    <div role="tabpanel" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><GraduationCap className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{profile?.fullName || t("unad.status.linked")}</h3>
            <p className="mt-0.5 truncate text-xs text-(--muted)">{account.documentType} {account.document}{profile?.institutionalEmail ? ` • ${profile.institutionalEmail}` : ""}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${account.lastError ? "bg-[rgba(198,40,40,0.1)] text-[#C62828]" : account.enabled ? "bg-(--secondary-light) text-(--secondary)" : "bg-(--bg-tertiary) text-(--muted)"}`}>
            {account.lastError ? t("unad.status.error") : account.enabled ? t("unad.status.running") : t("unad.status.paused")}
          </span>
        </div>
        {account.lastError ? <p role="alert" className="mt-3 rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2 text-xs text-[#C62828]">{t(errorKey)}</p> : null}
        <div className="mt-4 flex flex-col divide-y divide-(--border-light)">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <b className="block text-sm font-medium text-(--text-primary)">{t("unad.service.title")}</b>
              <span className="block text-xs text-(--muted)">{t("unad.service.text")}</span>
            </div>
            <Switch checked={account.enabled} onChange={(next) => { unadApi.updateSettings({ enabled: next }).catch(report); }} label={t("unad.service.title")} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <b className="block text-sm font-medium text-(--text-primary)">{t("unad.interval.title")}</b>
              <span className="block text-xs text-(--muted)">{t("unad.interval.text", { time: lastSync })}</span>
            </div>
            <div className="w-44">
              <Select
                value={String(account.intervalMinutes)}
                onChange={(value) => { unadApi.updateSettings({ intervalMinutes: Number(value) }).catch(report); }}
                options={[...new Set([...INTERVALS, account.intervalMinutes])].sort((a, b) => a - b).map((minutes) => ({ value: String(minutes), label: minutes < 60 ? t("duration.minutes", { count: minutes }) : t(minutes === 60 ? "duration.hour" : "duration.hours", { count: minutes / 60 }) }))}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => { void handleSync(); }} disabled={busy !== null}>
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "sync" ? "animate-spin" : ""}`} aria-hidden />
            {busy === "sync" ? t("unad.sync.running") : t("unad.sync.now")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={busy !== null}>
            <Unlink className="h-3.5 w-3.5" aria-hidden />
            {t("unad.disconnect")}
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--secondary)" />
        <h3 className="font-semibold">{t("unad.agendas.title")}</h3>
        <p className="mt-1 text-xs text-(--muted)">{t("unad.agendas.text")}</p>
        <form onSubmit={(e) => { void handleAddAgenda(e); }} className="mt-3 flex flex-wrap gap-2">
          <Input value={agendaUrl} onChange={(e) => setAgendaUrl(e.target.value)} placeholder="https://datateca.unad.edu.co/contenidos/agendas/2026-2204/212014.htm" className="min-w-60 flex-1" />
          <Button type="submit" variant="primary" disabled={busy !== null}>{busy === "agenda" ? t("unad.agendas.adding") : t("unad.agendas.add")}</Button>
        </form>
        <div className="mt-3 flex flex-col gap-2">
          {agendas.length ? agendas.map((agenda) => (
            <div key={agenda.id} className="flex items-center gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3" style={{ borderLeft: `4px solid ${agenda.color}` }}>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm text-(--text-primary)">{agenda.name || agenda.code}</b>
                <span className="block truncate text-xs text-(--muted)">{agenda.code} • {agenda.period} • {t("unad.agendas.activities", { count: agenda.activities.length })}</span>
              </div>
              <DeleteButton onConfirm={() => { unadApi.removeAgenda(agenda.id).catch(report); }} className="scale-[0.58] origin-right -my-2" />
            </div>
          )) : <p className="py-2 text-sm text-(--muted)">{t("unad.agendas.empty")}</p>}
        </div>
      </div>
    </div>
  );
}
