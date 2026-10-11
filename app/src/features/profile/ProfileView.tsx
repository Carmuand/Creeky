import { useEffect, useMemo, useState } from "react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { usePrioMeta } from "@/i18n/labels";
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProfileCard } from "@/features/profile/ProfileCard";
import { ProfileEditModal } from "@/features/profile/ProfileEditModal";
import { GoalBars } from "@/features/profile/GoalRings";
import type { GoalBarDatum } from "@/features/profile/GoalRings";
import { PulseCard } from "@/features/profile/PulseCard";
import { ListDonut } from "@/features/profile/ListDonut";
import type { DonutSegment } from "@/features/profile/ListDonut";

/**
 * Profile view with the account card, statistics and preferences.
 *
 * @returns The profile view.
 */
export function ProfileView() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const PRIO_META = usePrioMeta();
  const [range, setRange] = useState<"all" | "week">("all");
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const user = store.user;
  const report = (error: unknown) => pushToast(errorMessage(error), "error");

  const weekAgo = Date.now() - 7 * 864e5;
  const alive = useMemo(() => store.tasks.filter((t) => !t.deleted && (range === "all" || (t.createdAt || 0) >= weekAgo)), [store.tasks, range]);
  const done = useMemo(() => alive.filter((t) => t.done).length, [alive]);
  const focusMin = useMemo(() => store.pomoLog.filter((p) => p.mode === "focus" && (range === "all" || (p.ts || 0) >= weekAgo)).reduce((a, p) => a + (p.minutes || 0), 0), [store.pomoLog, range, weekAgo]);

  const priorityRings: GoalBarDatum[] = Object.entries(PRIO_META).map(([value, meta]) => {
    const group = alive.filter((t) => (t.priority || "none") === value);
    const finished = group.filter((t) => t.done).length;
    return {
      id: value,
      label: meta.label,
      detail: t("profile.priority.detail", { done: finished, total: group.length }),
      percent: group.length ? (finished / group.length) * 100 : 0,
      color: meta.color,
    };
  });
  const priorityBlended = priorityRings.length
    ? `${(priorityRings.reduce((acc, ring) => acc + ring.percent, 0) / priorityRings.length).toFixed(1)}%`
    : "0.0%";
  const listSegments: DonutSegment[] = store.lists.map((l) => ({
    id: l.id,
    label: l.name,
    value: alive.filter((t) => t.list === l.id).length,
    color: l.color,
  }));

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setIsEditing(false);
    }
  }, [user?.name]);

  const handleSave = () => {
    if (!user) return;
    authApi.updateProfile(name.trim() || user.name, user.email, null).catch(report);
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (user) setName(user.name || "");
    setIsEditing(false);
  };

  const handleAvatarUpload = (dataUrl: string) => {
    if (!user || !dataUrl) return;
    authApi.setAvatar(dataUrl).catch(report);
  };

  const handleAvatarRemove = () => {
    if (!user) return;
    authApi.setAvatar(null).catch(report);
  };

  if (!user) return <div className="p-6 text-sm text-(--muted)">{t("profile.noSession")}</div>;

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-labelledby="h-profile">
      <ProfileCard
        name={user.name || t("profile.fallbackName")}
        email={user.email}
        memberSince={t("profile.memberSince", { date: new Date(user.created).toLocaleDateString(locale) })}
        initial={(user.name || "U")[0].toUpperCase()}
        avatarUrl={user.avatar ?? undefined}
        onAvatarUpload={handleAvatarUpload}
        onAvatarRemove={handleAvatarRemove}
        stats={{ tasks: alive.length, completed: done, focusMinutes: focusMin, habits: store.habits.length }}
        onEdit={() => setEditOpen(true)}
      />
      <ProfileEditModal
        open={editOpen}
        defaultName={user.name || ""}
        defaultEmail={user.email}
        onClose={() => setEditOpen(false)}
      />

      <div className="grid grid-cols-2 gap-3 max-[1000px]:grid-cols-1">
        <div className="col-span-2 max-[1000px]:col-span-1">
          <PulseCard />
        </div>
        <ListDonut range={range} onRangeChange={setRange} segments={listSegments} />
        <GoalBars
          range={range}
          onRangeChange={setRange}
          bars={priorityRings}
          footerValue={priorityBlended}
          title={t("profile.priority.title")}
          subtitle={t("profile.priority.subtitle")}
          footerLabel={t("profile.priority.footer")}
        />
      </div>

      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <h3 className="font-semibold">{t("profile.prefs.title")}</h3>
        <p className="mt-1 text-xs text-(--muted)">{t("profile.prefs.text")}</p>
        <div className="mt-3 grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("common.name")}</label><Input id="pf-name" value={name} onChange={(e) => { setName(e.target.value); if (!isEditing) setIsEditing(true); }} onFocus={() => setIsEditing(true)} placeholder={t("auth.name.placeholder")} /></div>
          <div className="flex flex-col gap-1.5"><label className="text-xs font-medium text-(--text-soft)">{t("profile.prefs.initialView")}</label><Select value="tasks" onChange={() => {}} options={[{ value: "tasks", label: t("nav.tasks") }, { value: "calendar", label: t("nav.calendar") }, { value: "pomodoro", label: t("nav.pomodoro") }]} /></div>
        </div>
        {isEditing ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCancel}>{t("common.cancel")}</Button>
            <Button variant="primary" onClick={handleSave}>{t("common.save")}</Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}