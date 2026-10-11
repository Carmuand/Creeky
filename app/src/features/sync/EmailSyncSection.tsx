import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { SiApple, SiGmail } from "react-icons/si";
import { Link2, Mail, Send, Unlink } from "lucide-react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { errorMessage, useI18n } from "@/i18n";
import { dataApi, emailLinksApi } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import {
  EMAIL_PROVIDERS,
  buildBackupBody,
  buildBackupSubject,
  buildComposeUrl,
  isValidEmail,
} from "@/features/sync/emailProviders";
import type { BackupSummary, EmailProviderId } from "@/features/sync/emailProviders";
import { cn } from "@/lib/utils";

/**
 * Brand icons per provider.
 */
const PROVIDER_ICONS: Record<EmailProviderId, ComponentType<{ className?: string }>> = {
  gmail: SiGmail,
  outlook: Mail,
  apple: SiApple,
};

/**
 * Email-based backup linking section for the Sync view.
 *
 * Each provider card links the user's own address and sends a backup
 * by saving the encrypted file and opening the provider's compose flow
 * with subject and body prefilled, including the recovery key of that
 * backup. Links are stored by the backend.
 *
 * @returns The email backup section.
 */
export function EmailSyncSection() {
  const { store } = useCreekyStore();
  const { t, locale } = useI18n();
  const links = store.emailLinks;
  const [linking, setLinking] = useState<EmailProviderId | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const summary = useMemo<Omit<BackupSummary, "sizeKb" | "recoveryKey">>(() => {
    const alive = store.tasks.filter((task) => !task.deleted);
    return {
      pending: alive.filter((task) => !task.done).length,
      completed: alive.filter((task) => task.done).length,
      habits: store.habits.length,
      dateLabel: new Date().toLocaleString(locale),
    };
  }, [store, locale]);

  const providerName = (provider: EmailProviderId) => EMAIL_PROVIDERS.find((item) => item.id === provider)?.name ?? provider;

  const openLink = (provider: EmailProviderId) => {
    setLinking(provider);
    setDraftEmail(links.find((link) => link.provider === provider)?.email ?? "");
    setFormError("");
    setNotice("");
  };

  const closeLink = () => {
    setLinking(null);
    setDraftEmail("");
    setFormError("");
  };

  const confirmLink = async () => {
    if (!linking) return;
    const email = draftEmail.trim();
    if (!isValidEmail(email)) {
      setFormError(t("error.invalid_email"));
      return;
    }
    try {
      await emailLinksApi.save(linking, email);
      setNotice(t("email.notice.linked", { provider: providerName(linking), email }));
      closeLink();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  const unlink = (provider: EmailProviderId) => {
    emailLinksApi
      .remove(provider)
      .then(() => setNotice(t("email.notice.unlinked", { provider: providerName(provider) })))
      .catch((error: unknown) => setNotice(errorMessage(error)));
  };

  const sendBackup = async (provider: EmailProviderId) => {
    const link = links.find((item) => item.provider === provider);
    if (!link) {
      openLink(provider);
      return;
    }
    let details: BackupSummary;
    try {
      const result = await dataApi.exportBackup();
      if (result.cancelled) return;
      details = { ...summary, sizeKb: (result.size / 1024).toFixed(1), recoveryKey: result.key };
    } catch (error) {
      setNotice(errorMessage(error));
      return;
    }
    const subject = buildBackupSubject(t, details);
    const body = buildBackupBody(t, details);
    const url = buildComposeUrl(provider, link.email, subject, body);
    if (provider === "apple") {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    emailLinksApi.markSent(provider).catch(() => undefined);
    setNotice(t("email.notice.sent", { provider: providerName(provider), email: link.email }));
  };

  const linkingProvider = EMAIL_PROVIDERS.find((provider) => provider.id === linking) ?? null;

  return (
    <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) via-(--secondary) to-(--accent)" />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{t("email.title")}</h3>
          <p className="mt-1 text-xs text-(--muted)">{t("email.intro")}</p>
        </div>
        <span className="rounded-full bg-(--bg-tertiary) px-2.5 py-1 text-[11px] font-semibold text-(--muted)">
          {t("email.linkedCount", { count: links.length, total: EMAIL_PROVIDERS.length })}
        </span>
      </div>

      {notice ? (
        <div role="status" className="mt-3 rounded-lg border border-(--secondary-border) bg-(--secondary-light) px-3 py-2 text-xs text-(--secondary)">
          {notice}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
        {EMAIL_PROVIDERS.map((provider) => {
          const Icon = PROVIDER_ICONS[provider.id];
          const link = links.find((item) => item.provider === provider.id);
          const linked = Boolean(link);
          return (
            <div key={provider.id} className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-(--border-light) bg-(--bg-primary) p-4">
              <div aria-hidden className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(to right, ${provider.color}, transparent)` }} />
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--border-light)"
                  style={{ background: provider.soft, color: provider.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-(--text-primary)">{provider.name}</p>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      linked ? "bg-(--secondary-light) text-(--secondary)" : "bg-(--bg-tertiary) text-(--muted)",
                    )}
                  >
                    {linked ? t("email.linked") : t("email.notLinked")}
                  </span>
                </div>
              </div>
              <p className="text-xs text-(--muted)">{t(provider.taglineKey)}</p>
              {link ? (
                <div className="min-w-0 rounded-lg bg-(--bg-secondary) px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-(--text-primary)">{link.email}</p>
                  <p className="mt-0.5 text-[11px] text-(--muted)">
                    {link.lastSentAt ? t("email.lastSent", { date: new Date(link.lastSentAt).toLocaleString(locale) }) : t("email.neverSent")}
                  </p>
                </div>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2">
                {linked ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => { void sendBackup(provider.id); }}>
                      <Send className="h-3.5 w-3.5" aria-hidden />
                      {t("email.send")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => unlink(provider.id)}>
                      <Unlink className="h-3.5 w-3.5" aria-hidden />
                      {t("email.unlink")}
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => openLink(provider.id)}>
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    {t("email.linkProvider", { provider: provider.name })}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={linking !== null} onClose={closeLink}>
        <ModalHeader
          icon="✉️"
          title={linkingProvider ? t("email.linkProvider", { provider: linkingProvider.name }) : t("email.modal.title")}
          subtitle={t("email.modal.subtitle")}
          onClose={closeLink}
        />
        <ModalBody>
          {formError ? (
            <div role="alert" className="rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">
              {formError}
            </div>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
            {t("email.modal.label", { provider: linkingProvider?.name ?? t("email.modal.account") })}
            <Input
              id="email-link-address"
              type="email"
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder={t("auth.email.placeholder")}
            />
          </label>
          <p className="text-[11px] text-(--muted)">{t("email.modal.consent")}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeLink}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => { void confirmLink(); }}>
            {t("email.modal.submit")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
