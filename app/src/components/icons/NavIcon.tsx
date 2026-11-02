import { Icon } from "@/components/icons/Icon";
import { DEFAULT_ICON_THEME } from "@/lib/iconTheme";
import { useIconTheme } from "@/hooks/useIconTheme";

const rawThemes = import.meta.glob("../../assets/icons/themes/*/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const THEME_ICONS: Record<string, Record<string, string>> = {};

for (const [path, raw] of Object.entries(rawThemes)) {
  const match = path.match(/themes\/([^/]+)\/([^/]+)\.svg$/);
  if (!match) continue;
  const [, themeId, iconName] = match;
  THEME_ICONS[themeId] ??= {};
  THEME_ICONS[themeId][iconName] = raw;
}

/**
 * Properties for the {@link NavIcon} component.
 */
interface NavIconProps {
  /** Icon identifier. */
  name: string;
  /** Rendered size in pixels. */
  size: number;
}

/**
 * Navigation icon rendered with the colors of the active icon theme.
 *
 * @param props - Component properties.
 * @returns The themed icon, or the monochrome fallback when the theme lacks it.
 */
export function NavIcon({ name, size }: NavIconProps) {
  const { effectiveIconTheme } = useIconTheme();
  const raw = THEME_ICONS[effectiveIconTheme]?.[name] ?? THEME_ICONS[DEFAULT_ICON_THEME]?.[name];

  if (!raw) {
    return (
      <span className="nav-icon inline-flex shrink-0 items-center justify-center" style={{ color: "var(--icon-primary)" }}>
        <Icon name={name} size={size} />
      </span>
    );
  }

  const sized = raw.replace("<svg", `<svg width="${size}" height="${size}"`);
  return (
    <span
      aria-hidden="true"
      className="nav-icon inline-flex shrink-0 items-center justify-center"
      dangerouslySetInnerHTML={{ __html: sized }}
    />
  );
}
