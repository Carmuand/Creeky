import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Pencil, Trash2, Upload } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";

/**
 * Maximum accepted avatar file size in bytes.
 */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Properties for the {@link ProfileAvatar} component.
 */
export interface ProfileAvatarProps {
  /** Display name used to derive the fallback initials. */
  name: string;
  /** Single uppercase initial rendered when no photo is set. */
  initial: string;
  /** Photo data URL. When undefined the initials fallback is rendered. */
  imageUrl?: string;
  /** Called with the new photo data URL after a valid file is picked. */
  onUpload: (dataUrl: string) => void;
  /** Called when the user removes the current photo. */
  onRemove: () => void;
  /** Additional classes applied to the outer wrapper. */
  className?: string;
}

/**
 * React equivalent of the originui `avatar-07` pattern.
 *
 * Renders a rounded photo with an online dot. Opening it reveals
 * the photo actions: edit entry, upload a new photo or remove it.
 */
export function ProfileAvatar({ name, initial, imageUrl, onUpload, onRemove, className = "" }: ProfileAvatarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");

  const openPicker = () => fileRef.current?.click();

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFileError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFileError("La imagen no puede superar 2 MB.");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => onUpload(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn("relative shrink-0", className)}>
      <Dropdown
        trigger={
          <button
            type="button"
            aria-label="Editar foto de perfil"
            title="Editar foto de perfil"
            className="relative block h-21 w-21 overflow-hidden rounded-lg border border-(--accent-border) bg-(--bg-tertiary) transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-(--border-focus)"
          >
            {imageUrl ? (
              <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <span
                aria-hidden
                className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
                style={{ background: "linear-gradient(140deg, var(--accent) 0%, var(--accent-hover) 60%, #1a1a2e 130%)" }}
              >
                {initial}
              </span>
            )}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            >
              <Pencil className="h-3 w-3" aria-hidden />
              Editar
            </span>
          </button>
        }
      >
        <DropdownItem onClick={openPicker}>
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" aria-hidden />
            {imageUrl ? "Cambiar foto" : "Subir foto"}
          </span>
        </DropdownItem>
        {imageUrl ? (
          <DropdownItem danger onClick={onRemove}>
            <span className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" aria-hidden />
              Eliminar foto
            </span>
          </DropdownItem>
        ) : null}
      </Dropdown>
      <span aria-hidden className="absolute -end-1 -top-1 size-3 rounded-full border-2 border-(--bg-primary) bg-emerald-500" />
      <span className="sr-only">En línea</span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-hidden tabIndex={-1} />
      {fileError ? (
        <p role="alert" className="absolute left-0 top-full z-10 mt-1 w-44 rounded-md border border-[rgba(198,40,40,0.25)] bg-(--bg-primary) px-2 py-1 text-[11px] text-[#C62828]">
          {fileError}
        </p>
      ) : null}
    </div>
  );
}
