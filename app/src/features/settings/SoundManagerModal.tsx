import { useEffect, useState } from "react";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import { soundsApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface SoundManagerModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface ManagedSound {
  name: string;
  label: string;
  duration: number | null;
  builtin: boolean;
}

/**
 * Modal that lists every alarm sound so the user can rename or delete them.
 *
 * @param props - Component properties.
 * @returns The sound manager modal.
 */
export function SoundManagerModal({ open, onClose, onChanged }: SoundManagerModalProps) {
  const { t } = useI18n();
  const [sounds, setSounds] = useState<ManagedSound[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const list = await soundsApi.list();
      const withDurations = await Promise.all(
        list.map(async (s) => {
          try {
            const { dataUrl } = await soundsApi.getDataUrl(s.name);
            const audio = new Audio(dataUrl);
            const duration = await new Promise<number | null>((resolve) => {
              audio.addEventListener("loadedmetadata", () => resolve(audio.duration || null));
              audio.addEventListener("error", () => resolve(null));
            });
            return { name: s.name, label: s.label, duration, builtin: s.builtin };
          } catch {
            return { name: s.name, label: s.label, duration: null, builtin: s.builtin };
          }
        }),
      );
      setSounds(withDurations);
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const handleRename = async (name: string) => {
    const value = editValue.trim();
    if (!value) {
      setEditing(null);
      return;
    }
    try {
      await soundsApi.rename(name, value);
      setSounds((prev) => prev.map((s) => (s.name === name ? { ...s, label: value } : s)));
      setEditing(null);
      onChanged();
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await soundsApi.delete(name);
      setSounds((prev) => prev.filter((s) => s.name !== name));
      onChanged();
      pushToast(t("settings.sound.deleted"), "success");
    } catch (error: unknown) {
      pushToast(errorMessage(error), "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-md" closeOnBackdropClick={false}>
      <div className="flex flex-col gap-4 p-6">
        <h3 className="text-sm font-semibold text-(--text)">{t("settings.sound.manage")}</h3>
        {loading ? (
          <p className="text-xs text-(--muted)">{t("common.loading")}</p>
        ) : sounds.length === 0 ? (
          <p className="text-xs text-(--muted)">{t("settings.sound.noSounds")}</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {sounds.map((s) => (
              <div key={s.name} className="flex items-center gap-2 rounded-lg border border-(--border-light) bg-(--bg-secondary) px-3 py-2">
                <div className="flex-1 min-w-0">
                  {editing === s.name ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => void handleRename(s.name)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleRename(s.name); }}
                      autoFocus
                      className="h-7 text-xs"
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-sm font-medium text-(--text) hover:underline"
                      onClick={() => { setEditing(s.name); setEditValue(s.label); }}
                    >
                      {s.label}
                    </button>
                  )}
                  <div className="text-[11px] text-(--muted)">
                    {s.duration ? `${s.duration.toFixed(1)} s` : "—"}
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => { setEditing(s.name); setEditValue(s.label); }}>
                  {t("common.edit")}
                </Button>
                <Button variant="danger" size="sm" onClick={() => void handleDelete(s.name)} disabled={s.builtin}>
                  {t("common.delete")}
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}
