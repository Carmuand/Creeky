/**
 * Email provider linking for the Sync section.
 *
 * Creeky has no backend, so providers are linked by storing the user's
 * own address per provider and by opening that provider's compose flow
 * with a backup payload. No tokens or servers are involved.
 */

/**
 * Supported email providers.
 */
export type EmailProviderId = "gmail" | "outlook" | "apple";

/**
 * Static definition of an email provider.
 */
export interface EmailProvider {
  /** Stable identifier. */
  id: EmailProviderId;
  /** Display name. */
  name: string;
  /** Short description shown on the card. */
  tagline: string;
  /** Brand color used for the card accent. */
  color: string;
  /** Translucent brand color used for glows and badges. */
  soft: string;
}

/**
 * Persisted link between a provider and the user's address.
 */
export interface EmailLink {
  /** Linked provider. */
  provider: EmailProviderId;
  /** User's address for that provider. */
  email: string;
  /** Epoch millis when the link was created. */
  linkedAt: number;
  /** Epoch millis of the last backup sent, when any. */
  lastSentAt?: number;
}

/**
 * Summary of the backup attached to the composed message.
 */
export interface BackupSummary {
  /** Pending tasks count. */
  pending: number;
  /** Completed tasks count. */
  completed: number;
  /** Tracked habits count. */
  habits: number;
  /** Size of the JSON backup in kilobytes. */
  sizeKb: string;
  /** Backup date label. */
  dateLabel: string;
}

const STORAGE_KEY = "creeky_email_links_v1";

/**
 * Provider catalog shown in the Sync section.
 */
export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: "gmail",
    name: "Gmail",
    tagline: "Redacta en Gmail con tu copia adjunta.",
    color: "#EA4335",
    soft: "rgba(234,67,53,0.12)",
  },
  {
    id: "outlook",
    name: "Outlook",
    tagline: "Redacta en Outlook con tu copia adjunta.",
    color: "#0078D4",
    soft: "rgba(0,120,212,0.12)",
  },
  {
    id: "apple",
    name: "Apple Mail",
    tagline: "Abre tu app de correo con tu copia lista.",
    color: "#212121",
    soft: "rgba(33,33,33,0.08)",
  },
];

/**
 * Loads the persisted provider links.
 */
export function loadEmailLinks(): EmailLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmailLink[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((link) => EMAIL_PROVIDERS.some((provider) => provider.id === link.provider) && typeof link.email === "string");
  } catch {
    return [];
  }
}

/**
 * Persists the provider links.
 */
export function saveEmailLinks(links: EmailLink[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    return;
  }
}

/**
 * Builds the compose URL that opens the provider with a prefilled message.
 */
export function buildComposeUrl(provider: EmailProviderId, to: string, subject: string, body: string): string {
  if (provider === "gmail") {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  if (provider === "outlook") {
    return `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Builds the subject for the backup message.
 */
export function buildBackupSubject(summary: BackupSummary): string {
  return `Creeky · Copia de seguridad ${summary.dateLabel}`;
}

/**
 * Builds the body for the backup message.
 */
export function buildBackupBody(summary: BackupSummary): string {
  return [
    "Hola,",
    "",
    "Esta es tu copia de seguridad de Creeky.",
    `Fecha: ${summary.dateLabel}`,
    `Tareas pendientes: ${summary.pending}`,
    `Tareas completadas: ${summary.completed}`,
    `Hábitos: ${summary.habits}`,
    `Tamaño: ${summary.sizeKb} KB`,
    "",
    "Adjunta el archivo creeky-backup.json descargado antes de enviar este correo.",
    "Para restaurar, abre Sincronización → Importar y selecciona ese archivo.",
  ].join("\n");
}

/**
 * Validates an email address format.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
