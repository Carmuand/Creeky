import { Pencil, Trash2, Upload } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { TooltipSimple } from "@/components/ui/Tooltip";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

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
  /** Called when the user asks to choose a new photo. */
  onUpload: () => void;
  /** Called when the user removes the current photo. */
  onRemove: () => void;
  /** Additional classes applied to the outer wrapper. */
  className?: string;
}

/**
 * React equivalent of the originui `avatar-07` pattern.
 *
 * Renders a rounded photo with an online dot. Opening it reveals
 * the photo actions: upload a new photo or remove it. Choosing the
 * file is delegated to the backend, which shows a native dialog.
 *
 * @param props - Component properties.
 * @returns The avatar with its actions menu.
 */
export function ProfileAvatar({ name, initial, imageUrl, onUpload, onRemove, className = "" }: ProfileAvatarProps) {
  const { t } = useI18n();

  return (
    <div className={cn("relative shrink-0", className)}>
      <Dropdown
        trigger={
          <TooltipSimple content={t("avatar.edit")} side="right">
          <button
            type="button"
            aria-label={t("avatar.edit")}
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
              {t("common.edit")}
            </span>
          </button>
          </TooltipSimple>
        }
      >
        <DropdownItem onClick={onUpload}>
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" aria-hidden />
            {imageUrl ? t("avatar.change") : t("avatar.upload")}
          </span>
        </DropdownItem>
        {imageUrl ? (
          <DropdownItem danger onClick={onRemove}>
            <span className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" aria-hidden />
              {t("avatar.remove")}
            </span>
          </DropdownItem>
        ) : null}
      </Dropdown>
      <span aria-hidden className="absolute -inset-e-1 -top-1 size-3 rounded-full border-2 border-(--bg-primary) bg-emerald-500" />
      <span className="sr-only">{t("avatar.online")}</span>
    </div>
  );
}
