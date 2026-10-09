import { useEffect, useState } from "react";
import { db } from "@/services/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

/**
 * Properties for the {@link ProfileEditModal} component.
 */
export interface ProfileEditModalProps {
  /** Controls the visibility state of the modal. */
  open: boolean;
  /** Identifier of the user being edited. */
  userId: string;
  /** Name used to prefill the form when the modal opens. */
  defaultName: string;
  /** Email used to prefill the form when the modal opens. */
  defaultEmail: string;
  /** Callback fired when the modal requests to close. */
  onClose: () => void;
  /** Callback fired after the profile is persisted. */
  onSaved: () => void;
}

/**
 * Profile edition dialog for name, email and password.
 *
 * An empty password keeps the current one. Validation messages
 * are shown inline and nothing is persisted until they pass.
 */
export function ProfileEditModal({ open, userId, defaultName, defaultEmail, onClose, onSaved }: ProfileEditModalProps) {
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

  const handleSubmit = () => {
    const nextName = name.trim();
    const nextEmail = email.trim();
    if (!nextName) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Escribe un correo válido.");
      return;
    }
    if (password && password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    const store = db.load();
    const target = store.users.find((candidate) => candidate.id === userId);
    if (!target) {
      setError("No se encontró el usuario.");
      return;
    }
    if (store.users.some((candidate) => candidate.id !== userId && candidate.email === nextEmail)) {
      setError("Ese correo ya está registrado.");
      return;
    }
    target.name = nextName;
    target.email = nextEmail;
    if (password) target.pass = btoa(password);
    db.save(store);
    onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader icon="✏️" title="Editar perfil" subtitle="Actualiza tu nombre, correo y contraseña." onClose={onClose} />
      <ModalBody>
        {error ? (
          <div role="alert" className="rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">
            {error}
          </div>
        ) : null}
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          Nombre
          <Input id="profile-edit-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          Correo
          <Input id="profile-edit-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
          Contraseña
          <Input
            id="profile-edit-pass"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Déjala en blanco para no cambiarla"
          />
        </label>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Guardar cambios
        </Button>
      </ModalFooter>
    </Modal>
  );
}
