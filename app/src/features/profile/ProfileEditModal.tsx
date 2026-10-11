import { useEffect, useState } from "react";
import { errorMessage, useI18n } from "@/i18n";
import { authApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

/**
 * Properties for the {@link ProfileEditModal} component.
 */
export interface ProfileEditModalProps {
  /** Controls the visibility state of the modal. */
  open: boolean;
  /** Name used to prefill the form when the modal opens. */
  defaultName: string;
  /** Email used to prefill the form when the modal opens. */
  defaultEmail: string;
  /** Callback fired when the modal requests to close. */
  onClose: () => void;
}

/**
 * Profile edition dialog for name, email and password.
 *
 * An empty password keeps the current one. Validation messages
 * are shown inline and nothing is persisted until they pass. The new
 * password is hashed and stored by the backend in the credential manager.
 *
 * @param props - Component properties.
 * @returns The profile edition dialog.
 */
export function ProfileEditModal({ open, defaultName, defaultEmail, onClose }: ProfileEditModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail);
    setPassword("");
    setError("");
  }, [open, defaultName, defaultEmail]);

  const handleSubmit = async () => {
    const nextName = name.trim();
    const nextEmail = email.trim();
    if (!nextName) {
      setError(t("error.name_required"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError(t("error.invalid_email"));
      return;
    }
    if (password && password.length < 4) {
      setError(t("error.weak_password"));
      return;
    }
    try {
      await authApi.updateProfile(nextName, nextEmail, password || null);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader icon="✏️" title={t("profile.edit.title")} subtitle={t("profile.edit.subtitle")} onClose={onClose} />
      <ModalBody>
        {error ? (
          <div role="alert" className="rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">
            {error}
          </div>
        ) : null}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          {t("common.name")}
          <Input id="profile-edit-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("auth.name.placeholder")} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          {t("auth.email")}
          <Input id="profile-edit-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("auth.email.placeholder")} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          {t("auth.password")}
          <Input
            id="profile-edit-pass"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("profile.edit.password.placeholder")}
          />
        </label>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={() => { void handleSubmit(); }}>
          {t("common.saveChanges")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
