import { useEffect, useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { pushToast } from "@/hooks/useToast";
import { useI18n } from "@/i18n";

/**
 * Properties for the {@link BackupKeyModal} component.
 */
interface BackupKeyModalProps {
  /** Recovery key of the backup just written, or null to keep the modal closed. */
  recoveryKey: string | null;
  /** Path of the written backup file. */
  path: string;
  /** Called when the user closes the modal. */
  onClose: () => void;
}

/**
 * Modal that shows the one-time recovery key of an exported backup. The
 * key is never stored, so this is the only moment the user can copy it.
 *
 * @param props - Component properties.
 * @returns The recovery key modal.
 */
export function BackupKeyModal({ recoveryKey, path, onClose }: BackupKeyModalProps) {
  const { t } = useI18n();

  const handleCopy = () => {
    if (!recoveryKey) return;
    navigator.clipboard
      .writeText(recoveryKey)
      .then(() => pushToast(t("backup.key.copied"), "success"))
      .catch(() => pushToast(t("backup.key.copyFailed"), "error"));
  };

  return (
    <Modal open={recoveryKey !== null} onClose={onClose} className="w-full max-w-120 max-h-[90vh]" closeOnBackdropClick={false}>
      <ModalHeader title={t("backup.key.title")} subtitle={t("backup.key.subtitle")} onClose={onClose} />
      <ModalBody className="gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-(--accent-border) bg-(--accent-light) p-3">
          <KeyRound className="h-4 w-4 shrink-0 text-(--accent)" aria-hidden />
          <code className="min-w-0 flex-1 select-all break-all text-sm font-semibold tracking-wider text-(--text-primary)">{recoveryKey}</code>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t("backup.key.copy")}
          </Button>
        </div>
        <p className="text-xs text-(--muted)">{t("backup.key.warning")}</p>
        <p className="break-all text-[11px] text-(--muted)">{t("backup.key.path", { path })}</p>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>{t("backup.key.done")}</Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Properties for the {@link ImportKeyModal} component.
 */
interface ImportKeyModalProps {
  /** Controls the visibility of the modal. */
  open: boolean;
  /** Whether an import is in progress. */
  busy: boolean;
  /** Called when the modal requests to close. */
  onClose: () => void;
  /** Called with the recovery key once the user confirms. */
  onSubmit: (recoveryKey: string) => void;
}

/**
 * Modal that asks for the recovery key before choosing the backup file.
 *
 * @param props - Component properties.
 * @returns The import key modal.
 */
export function ImportKeyModal({ open, busy, onClose, onSubmit }: ImportKeyModalProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <Modal open={open} onClose={onClose} className="w-full max-w-120 max-h-[90vh]">
      <ModalHeader title={t("backup.import.title")} subtitle={t("backup.import.subtitle")} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody className="gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
            {t("backup.import.label")}
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" autoFocus required />
          </label>
          <p className="text-[11px] text-(--muted)">{t("backup.import.warning")}</p>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={busy}>{t("backup.import.submit")}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
