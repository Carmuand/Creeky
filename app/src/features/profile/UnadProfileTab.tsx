import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { navigateTo } from "@/utils/navigation";
import type { UnadProfile } from "@/types/creeky";

/**
 * Profile fields shown in the tab with the message key of their label.
 */
const PROFILE_FIELDS: { key: keyof UnadProfile; labelKey: MessageKey }[] = [
  { key: "fullName", labelKey: "unad.profile.fullName" },
  { key: "institutionalEmail", labelKey: "unad.profile.institutionalEmail" },
  { key: "notificationEmail", labelKey: "unad.profile.notificationEmail" },
  { key: "personalEmail", labelKey: "unad.profile.personalEmail" },
  { key: "phone", labelKey: "unad.profile.phone" },
  { key: "birthDate", labelKey: "unad.profile.birthDate" },
  { key: "maritalStatus", labelKey: "unad.profile.maritalStatus" },
  { key: "bloodType", labelKey: "unad.profile.bloodType" },
  { key: "zone", labelKey: "unad.profile.zone" },
  { key: "stratum", labelKey: "unad.profile.stratum" },
  { key: "address", labelKey: "unad.profile.address" },
];

/**
 * Number of upcoming activities listed.
 */
const UPCOMING_LIMIT = 8;

/**
 * UNAD tab of the profile view. It shows the data read from the campus
 * profile of the linked account, the followed courses and the next
 * activities to close.
 *
 * @returns The UNAD profile tab.
 */
export function UnadProfileTab() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const { connected, account, profile, agendas } = store.unad;

  if (!connected || !account || !profile) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-8 text-center shadow-sm">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-xl bg-(--accent-light) text-(--accent)"><GraduationCap className="h-6 w-6" /></span>
        <h3 className="font-semibold">{t("unad.profile.empty.title")}</h3>
        <p className="max-w-110 text-sm text-(--muted)">{t("unad.profile.empty.text")}</p>
        <Button variant="primary" size="sm" onClick={() => navigateTo("settings")}>{t("unad.profile.empty.action")}</Button>
      </div>
    );
  }

  const now = Date.now();
  const upcoming = agendas
    .flatMap((agenda) => agenda.activities.filter((activity) => activity.endsAt).map((activity) => ({ agenda, activity, end: new Date(activity.endsAt).getTime() })))
    .filter((item) => item.end >= now)
    .sort((a, b) => a.end - b.end)
    .slice(0, UPCOMING_LIMIT);
  const formatMoment = (iso: string) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><GraduationCap className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{profile.fullName}</h3>
            <p className="truncate text-xs text-(--muted)">{account.documentType} {account.document} • {t("unad.profile.campusId", { id: profile.campusUserId })}</p>
          </div>
          {profile.updatedAt ? <span className="text-[11px] text-(--muted)">{t("unad.profile.updated", { date: new Date(profile.updatedAt).toLocaleString(locale) })}</span> : null}
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
          {PROFILE_FIELDS.map(({ key, labelKey }) => (
            <div key={key} className="min-w-0 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-3 py-2">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-(--muted)">{t(labelKey)}</dt>
              <dd className="mt-0.5 truncate text-sm text-(--text-primary)">{String(profile[key] || "—")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--accent)" />
          <h3 className="font-semibold">{t("unad.profile.courses", { count: agendas.length })}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {agendas.length ? agendas.map((agenda) => (
              <div key={agenda.id} className="rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3" style={{ borderLeft: `4px solid ${agenda.color}` }}>
                <b className="block truncate text-sm text-(--text-primary)">{agenda.name || agenda.code}</b>
                <span className="block truncate text-xs text-(--muted)">{agenda.credits}</span>
                <span className="block truncate text-xs text-(--muted)">{agenda.period} • {t("unad.agendas.activities", { count: agenda.activities.length })}</span>
              </div>
            )) : <p className="text-sm text-(--muted)">{t("unad.agendas.empty")}</p>}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
          <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--secondary)" />
          <h3 className="font-semibold">{t("unad.profile.upcoming")}</h3>
          <div className="mt-3 flex flex-col gap-2">
            {upcoming.length ? upcoming.map(({ agenda, activity }) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3" style={{ borderLeft: `4px solid ${agenda.color}` }}>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-(--text-primary)">{activity.name}</b>
                  <span className="block truncate text-xs text-(--muted)">{agenda.name || agenda.code}{activity.weight ? ` • ${t("unad.activity.points", { points: activity.weight })}` : ""}</span>
                </div>
                <span className="shrink-0 text-right text-xs font-medium text-(--text-soft)">{formatMoment(activity.endsAt)}</span>
              </div>
            )) : <p className="text-sm text-(--muted)">{t("unad.profile.noUpcoming")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
