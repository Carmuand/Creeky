import { useEffect, useRef, useState } from "react";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { settingsApi, soundsApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SoundManagerModal } from "@/features/settings/SoundManagerModal";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

/**
 * Sound settings for the Pomodoro alarm. The alarm only plays when the
 * toggle is on; otherwise the volume, sound and test controls are disabled.
 *
 * @returns The sound settings section.
 */
export function SoundSection() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(80);
  const [sound, setSound] = useState("default.wav");
  const [sounds, setSounds] = useState<{ name: string; label: string; trimStart: number; trimEnd: number; builtin: boolean }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [managerOpen, setManagerOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ name: string; label: string; trimStart: number; trimEnd: number } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameTrimStart, setRenameTrimStart] = useState(0);
  const [renameTrimEnd, setRenameTrimEnd] = useState(0);
  const [soundDuration, setSoundDuration] = useState(0);

  const [repeat, setRepeat] = useState(false);
  const [repeatCount, setRepeatCount] = useState(3);
  const [repeatDuration, setRepeatDuration] = useState(0);

  const load = async () => {
    try {
      const [alarm, list] = await Promise.all([
        settingsApi.getPomodoroAlarm(),
        soundsApi.list(),
      ]);
      setEnabled(alarm.enabled);
      setVolume(alarm.volume);
      setSound(alarm.sound);
      setRepeat(alarm.repeat);
      setRepeatCount(alarm.repeatCount);
      setRepeatDuration(alarm.repeatDuration);
      setSounds(list);
      setLoaded(true);
    } catch (error: unknown) {
      setLoaded(true);
      pushToast(errorMessage(error), "error");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!sound) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await soundsApi.getDataUrl(sound);
        if (cancelled) return;
        const audio = new Audio(r.dataUrl);
        audio.addEventListener("loadedmetadata", () => {
          if (!cancelled) setSoundDuration(audio.duration || 0);
        });
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [sound]);

  const handleToggle = async () => {
    if (busy || !loaded) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmEnabled(!enabled);
      setEnabled(result.enabled);
      pushToast(result.enabled ? t("settings.sound.toast.on") : t("settings.sound.toast.off"), "success");
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleVolume = async (next: number) => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmVolume(next);
      setVolume(result.volume);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleSound = async (next: string) => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmSound(next);
      setSound(result.sound);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRepeatToggle = async () => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmRepeat(!repeat);
      setRepeat(result.repeat);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRepeatCount = async (next: number) => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmRepeatCount(next);
      setRepeatCount(result.repeatCount);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRepeatDuration = async (next: number) => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await settingsApi.setPomodoroAlarmRepeatDuration(next);
      setRepeatDuration(result.repeatDuration);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (busy || !loaded || !enabled) return;
    setBusy(true);
    try {
      const result = await soundsApi.pick();
      if ("cancelled" in result && result.cancelled) return;
      if ("name" in result) {
        setRenaming({ name: result.name, label: result.label, trimStart: result.trimStart ?? 0, trimEnd: result.trimEnd ?? 0 });
        setRenameValue(result.label);
        setRenameTrimStart(result.trimStart ?? 0);
        setRenameTrimEnd(result.trimEnd ?? 0);
      }
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRenameConfirm = async () => {
    if (!renaming) return;
    const finalName = renameValue.trim() || renaming.label;
    setBusy(true);
    try {
      if (finalName !== renaming.label) {
        await soundsApi.rename(renaming.name, finalName);
      }
      await soundsApi.setTrim(renaming.name, renameTrimStart, renameTrimEnd);
      await settingsApi.setPomodoroAlarmSound(renaming.name);
      setSound(renaming.name);
      await load();
      pushToast(t("settings.sound.imported"), "success");
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setRenaming(null);
      setBusy(false);
    }
  };

  const handleTestTrim = async () => {
    if (!renaming) return;
    try {
      const { dataUrl } = await soundsApi.getDataUrl(renaming.name);
      const audio = new Audio(dataUrl);
      audio.volume = volume / 100;
      const start = renameTrimStart > 0 ? renameTrimStart : 0;
      const end = renameTrimEnd > 0 ? renameTrimEnd : (soundDuration || audio.duration || 0);
      audio.currentTime = start;
      audio.play().catch(() => undefined);
      const stop = () => {
        if (audio.currentTime >= end) {
          audio.pause();
          audio.removeEventListener("timeupdate", stop);
        }
      };
      audio.addEventListener("timeupdate", stop);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleTest = async () => {
    if (busy || !loaded || !enabled) return;
    try {
      const alarm = await settingsApi.getPomodoroAlarm();
      const { dataUrl, trimStart, trimEnd } = await soundsApi.getDataUrl(sound);
      const audio = new Audio(dataUrl);
      audio.volume = volume / 100;
      const start = trimStart > 0 ? trimStart : 0;
      const end = trimEnd > 0 ? trimEnd : (soundDuration || 0);
      let plays = 0;
      const maxPlays = alarm.repeat ? (alarm.repeatDuration > 0 ? 1000 : Math.max(1, alarm.repeatCount)) : 1;
      const startedAt = Date.now();
      const playNext = () => {
        if (plays >= maxPlays) return;
        if (alarm.repeat && alarm.repeatDuration > 0 && (Date.now() - startedAt) / 1000 >= alarm.repeatDuration) return;
        plays += 1;
        audio.currentTime = start;
        audio.play().catch(() => undefined);
      };
      audio.addEventListener("timeupdate", () => {
        const limit = end > 0 ? end : audio.duration;
        if (limit > 0 && audio.currentTime >= limit) {
          audio.pause();
          playNext();
        }
      });
      audio.addEventListener("ended", () => playNext());
      playNext();
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = audio;
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    }
  };

  const disabled = !enabled || !loaded || busy;

  const selectOptions = sounds.map((s) => ({ value: s.name, label: s.label }));

  return (
    <div role="tabpanel" className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm">
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold">{t("settings.sound.title")}</h3>
            <p className="mt-1 text-xs text-(--muted)">{t("settings.sound.text")}</p>
          </div>
          <Switch
            checked={enabled}
            onChange={handleToggle}
            label={t("settings.sound.title")}
            disabled={busy || !loaded}
          />
        </div>
        <p className="mt-3 text-[11px] text-(--muted)">{enabled ? t("settings.sound.on") : t("settings.sound.off")}</p>

        <div className="mt-4 border-t border-(--border-light) pt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">{t("settings.sound.volume")}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              disabled={disabled}
              onChange={(e) => setVolume(Number(e.target.value))}
              onMouseUp={() => void handleVolume(volume)}
              onTouchEnd={() => void handleVolume(volume)}
              className={cn("w-full accent-(--accent)", disabled && "opacity-50")}
            />
            <span className="text-xs text-(--muted)">{volume}%</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">{t("settings.sound.choice")}</label>
            <div className={cn(disabled && "pointer-events-none opacity-50")}>
              <Select value={sound} options={selectOptions} onChange={(v) => void handleSound(v)} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold">{t("settings.sound.repeat")}</h4>
              <p className="mt-1 text-xs text-(--muted)">{t("settings.sound.repeatText")}</p>
            </div>
            <Switch
              checked={repeat}
              onChange={handleRepeatToggle}
              label={t("settings.sound.repeat")}
              disabled={disabled}
            />
          </div>

          {repeat ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">{t("settings.sound.repeatCount")}</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={repeatCount}
                  disabled={disabled}
                  onChange={(e) => setRepeatCount(Number(e.target.value))}
                  onBlur={() => void handleRepeatCount(repeatCount)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold">{t("settings.sound.repeatDuration")}</label>
                <Input
                  type="number"
                  min={0}
                  max={300}
                  value={repeatDuration}
                  disabled={disabled}
                  onChange={(e) => setRepeatDuration(Number(e.target.value))}
                  onBlur={() => void handleRepeatDuration(repeatDuration)}
                />
                <span className="text-xs text-(--muted)">{t("settings.sound.repeatDurationHint")}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void handleImport()} disabled={disabled}>
              {t("settings.sound.import")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setManagerOpen(true)} disabled={busy || !loaded}>
              {t("settings.sound.manage")}
            </Button>
            <Button variant="primary" size="sm" onClick={() => void handleTest()} disabled={disabled}>
              {t("settings.sound.test")}
            </Button>
          </div>
        </div>
      </div>

      <Modal open={renaming !== null} onClose={() => setRenaming(null)} className="w-full max-w-sm" closeOnBackdropClick={false}>
        <div className="flex flex-col gap-4 p-6">
          <h3 className="text-sm font-semibold text-(--text)">{t("settings.sound.namePrompt")}</h3>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">{t("settings.sound.trimStart")}</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={renameTrimStart}
              onChange={(e) => setRenameTrimStart(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold">{t("settings.sound.trimEnd")}</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={renameTrimEnd}
              onChange={(e) => setRenameTrimEnd(Number(e.target.value))}
            />
            {soundDuration > 0 ? (
              <span className="text-xs text-(--muted)">{t("settings.sound.duration", { seconds: soundDuration.toFixed(1) })}</span>
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => void handleTestTrim()}>{t("settings.sound.test")}</Button>
            <Button variant="secondary" size="sm" onClick={() => setRenaming(null)}>{t("common.cancel")}</Button>
            <Button variant="primary" size="sm" onClick={() => void handleRenameConfirm()}>{t("common.confirm")}</Button>
          </div>
        </div>
      </Modal>

      <SoundManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} onChanged={() => void load()} />
    </div>
  );
}
