import { GraduationCap, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { navigateTo } from "@/utils/navigation";
import type { UnadCipasSession, UnadProfile } from "@/types/creeky";

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
 * CIPAS group shown in the profile tab, with its scheduled sessions.
 */
interface CipasGroupView {
  /** Key built from the course and the group name. */
  key: string;
  /** Course name, or its code when the name is missing. */
  courseName: string;
  /** CIPAS group name. */
  groupName: string;
  /** Enrollment confirmation number. */
  confirmation: string;
  /** Enrollment status text shown by the portal. */
  summary: string;
  /** Sessions sorted by start. */
  sessions: UnadCipasSession[];
}

/**
 * Groups the scheduled CIPAS classes by course and group, ordered by course
 * name and start.
 *
 * @param sessions - Sessions read from the campus.
 * @returns One entry per course and group.
 */
function groupCipasSessions(sessions: UnadCipasSession[]): CipasGroupView[] {
  const groups = new Map<string, CipasGroupView>();
  for (const session of sessions) {
    const key = `${session.courseCode}|${session.groupName}`;
    const group = groups.get(key) ?? {
      key,
      courseName: session.courseName || session.courseCode,
      groupName: session.groupName,
      confirmation: session.confirmation,
      summary: session.summary,
      sessions: [],
    };
    group.sessions.push(session);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, sessions: [...group.sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName) || a.groupName.localeCompare(b.groupName));
}

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
  const { connected, account, profile, agendas, cipas } = store.unad;

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
  const formatRange = (start: string, end: string) => `${formatMoment(start)} – ${new Date(end).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`;
  const cipasGroups = groupCipasSessions(cipas);
  const cipasCourses = new Set(cipas.map((session) => session.courseCode)).size;

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

      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-(--accent)" />
        <div className="flex flex-wrap items-center gap-2">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-light) text-(--accent)"><Video className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{t("unad.cipas.title")}</h3>
            <p className="text-xs text-(--muted)">{t("unad.cipas.text")}</p>
          </div>
          {cipas.length ? <span className="shrink-0 rounded-full border border-(--border-light) bg-(--bg-secondary) px-2.5 py-1 text-[11px] font-medium text-(--text-soft)">{t("unad.cipas.course", { count: cipasCourses })}</span> : null}
        </div>
        {cipasGroups.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3 max-[900px]:grid-cols-1">
            {cipasGroups.map((group) => (
              <div key={group.key} className="rounded-lg border border-(--border-light) bg-(--bg-secondary) p-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <b className="truncate text-sm text-(--text-primary)">{group.courseName}</b>
                  <span className="rounded-full bg-(--accent-light) px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--accent)">{group.groupName || t("unad.cipas.group")}</span>
                  <span className="ml-auto text-[11px] text-(--muted)">{t("unad.cipas.sessions", { count: group.sessions.length })}</span>
                </div>
                {group.summary ? <p className="mt-1 text-[11px] text-(--muted)">{group.summary}</p> : null}
                {group.confirmation ? <p className="mt-0.5 text-[11px] text-(--muted)">{t("unad.cipas.confirmation")}: {group.confirmation}</p> : null}
                <div className="mt-2 flex flex-col gap-2">
                  {group.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg border border-(--border-light) bg-(--bg-primary) p-2.5">
                      <p className="text-[11px] font-semibold text-(--text-soft)">{session.startsAt && session.endsAt ? formatRange(session.startsAt, session.endsAt) : session.dateRaw}</p>
                      {session.topic ? <p className="mt-0.5 text-sm font-medium text-(--text-primary)">{session.topic}</p> : null}
                      {session.scenario ? <p className="text-[11px] text-(--muted)">{t("unad.cipas.scenario")}: {session.scenario}</p> : null}
                      {session.additionalInfo ? <p className="text-[11px] text-(--muted)">{t("unad.cipas.info")}: {session.additionalInfo}</p> : null}
                      {session.link ? (
                        <a href={session.link} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-(--accent) hover:underline"><ExternalLink className="h-3 w-3" aria-hidden />{t("unad.cipas.join")}</a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-(--muted)">{t("unad.cipas.none")}</p>}
      </div>
    </div>
  );
}
