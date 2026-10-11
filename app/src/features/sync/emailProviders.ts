/**
 * Email provider linking for the Sync section.
 *
 * Providers are linked by storing the user's own address per provider in
 * the backend database and by opening that provider's compose flow with a
 * backup payload. No tokens or servers are involved.
 */

import type { MessageKey, Translate } from "@/i18n";
import type { EmailLink } from "@/types/creeky";

export type { EmailLink };

/**
 * Supported email providers.
 */
export type EmailProviderId = EmailLink["provider"];

/**
 * Static definition of an email provider.
 */
export interface EmailProvider {
  /** Stable identifier. */
  id: EmailProviderId;
  /** Display name. */
  name: string;
  /** Message key of the short description shown on the card. */
  taglineKey: MessageKey;
  /** Brand color used for the card accent. */
  color: string;
  /** Translucent brand color used for glows and badges. */
  soft: string;
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

/**
 * Provider catalog shown in the Sync section.
 */
export const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: "gmail",
    name: "Gmail",
    taglineKey: "email.tagline.gmail",
    color: "#EA4335",
    soft: "rgba(234,67,53,0.12)",
  },
  {
    id: "outlook",
    name: "Outlook",
    taglineKey: "email.tagline.outlook",
    color: "#0078D4",
    soft: "rgba(0,120,212,0.12)",
  },
  {
    id: "apple",
    name: "Apple Mail",
    taglineKey: "email.tagline.apple",
    color: "#212121",
    soft: "rgba(33,33,33,0.08)",
  },
];

/**
 * Builds the compose URL that opens the provider with a prefilled message.
 *
 * @param provider - Provider that composes the message.
 * @param to - Recipient address.
 * @param subject - Message subject.
 * @param body - Message body.
 * @returns The compose URL.
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
 *
 * @param t - Translation function.
 * @param summary - Backup summary.
 * @returns The message subject.
 */
export function buildBackupSubject(t: Translate, summary: BackupSummary): string {
  return t("email.backup.subject", { date: summary.dateLabel });
}

/**
 * Builds the body for the backup message.
 *
 * @param t - Translation function.
 * @param summary - Backup summary.
 * @returns The message body.
 */
export function buildBackupBody(t: Translate, summary: BackupSummary): string {
  return [
    t("email.backup.greeting"),
    "",
    t("email.backup.intro"),
    t("email.backup.date", { date: summary.dateLabel }),
    t("email.backup.pending", { count: summary.pending }),
    t("email.backup.completed", { count: summary.completed }),
    t("email.backup.habits", { count: summary.habits }),
    t("email.backup.size", { size: summary.sizeKb }),
    "",
    t("email.backup.attach"),
    t("email.backup.restore"),
  ].join("\n");
}

/**
 * Validates an email address format.
 *
 * @param value - Address to validate.
 * @returns True when the address looks valid.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
