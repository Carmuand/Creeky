import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { useI18n } from "@/i18n";

/**
 * Properties for the {@link ConfirmDialog} component.
 */
interface ConfirmDialogProps {
  /** Controls whether the dialog is visible. */
  open: boolean;
  /** Icon name for the leading badge. @default "trash" */
  icon?: string;
  /** Main title displayed in the dialog. */
  title: string;
  /** Supporting text shown beneath the title. */
  description: string;
  /** Label for the confirm button. Defaults to the translated "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to the translated "Cancel". */
  cancelLabel?: string;
  /** Visual variant for the confirm button. @default "danger" */
  variant?: "primary" | "danger";
  /** Callback fired when the user confirms. */
  onConfirm: () => void;
  /** Callback fired when the user cancels. */
  onCancel: () => void;
}

/**
 * Confirmation dialog built on `Modal`.
 *
 * @param props - Component properties.
 * @returns The confirmation dialog.
 */
export function ConfirmDialog({ open, icon = "trash", title, description, confirmLabel, cancelLabel, variant = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onCancel} className="w-full max-w-sm" closeOnBackdropClick={false}>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-(--border-medium) bg-(--accent-light) text-(--accent)">
            <Icon name={icon} size={16} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-(--text)">{title}</h3>
            <p className="text-xs leading-relaxed text-(--muted)">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>{cancelLabel ?? t("common.cancel")}</Button>
          <Button variant={variant} size="sm" onClick={onConfirm}>{confirmLabel ?? t("common.confirm")}</Button>
        </div>
      </div>
    </Modal>
  );
}