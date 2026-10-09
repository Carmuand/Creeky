import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { SiApple, SiGmail } from "react-icons/si";
import { Link2, Mail, Send, Unlink } from "lucide-react";
import { useCreekyStore } from "@/hooks/useCreekyStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import {
  EMAIL_PROVIDERS,
  buildBackupBody,
  buildBackupSubject,
  buildComposeUrl,
  isValidEmail,
  loadEmailLinks,
  saveEmailLinks,
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
 * by downloading the JSON file and opening the provider's compose flow
 * with subject and body prefilled.
 */
export function EmailSyncSection() {
  const { store } = useCreekyStore();
  const [links, setLinks] = useState(loadEmailLinks);
  const [linking, setLinking] = useState<EmailProviderId | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const summary = useMemo<BackupSummary>(() => {
    const alive = store.tasks.filter((task) => !task.deleted);
    return {
      pending: alive.filter((task) => !task.done).length,
      completed: alive.filter((task) => task.done).length,
      habits: store.habits.length,
      sizeKb: (JSON.stringify(store).length / 1024).toFixed(1),
      dateLabel: new Date().toLocaleString(),
    };
  }, [store]);

  const persist = (next: typeof links) => {
    setLinks(next);
    saveEmailLinks(next);
  };

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

  const confirmLink = () => {
    if (!linking) return;
    const email = draftEmail.trim();
    if (!isValidEmail(email)) {
      setFormError("Escribe un correo válido.");
      return;
    }
    const next = links.some((link) => link.provider === linking)
      ? links.map((link) => (link.provider === linking ? { ...link, email } : link))
      : [...links, { provider: linking, email, linkedAt: Date.now() }];
    persist(next);
    const providerName = EMAIL_PROVIDERS.find((provider) => provider.id === linking)?.name ?? linking;
    setNotice(`${providerName} vinculado a ${email}.`);
    closeLink();
  };

  const unlink = (provider: EmailProviderId) => {
    persist(links.filter((link) => link.provider !== provider));
    const providerName = EMAIL_PROVIDERS.find((item) => item.id === provider)?.name ?? provider;
    setNotice(`${providerName} desvinculado.`);
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "creeky-backup.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const sendBackup = (provider: EmailProviderId) => {
    const link = links.find((item) => item.provider === provider);
    if (!link) {
      openLink(provider);
      return;
    }
    downloadBackup();
    const subject = buildBackupSubject(summary);
    const body = buildBackupBody(summary);
    const url = buildComposeUrl(provider, link.email, subject, body);
    if (provider === "apple") {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    persist(links.map((item) => (item.provider === provider ? { ...item, lastSentAt: Date.now() } : item)));
    const providerName = EMAIL_PROVIDERS.find((item) => item.id === provider)?.name ?? provider;
    setNotice(`Copia descargada y redacción abierta en ${providerName} para ${link.email}. Adjunta el archivo antes de enviar.`);
  };

  const linkingProvider = EMAIL_PROVIDERS.find((provider) => provider.id === linking) ?? null;

  return (
    <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-(--accent) via-(--secondary) to-(--accent)" />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Correo electrónico</h3>
          <p className="mt-1 text-xs text-(--muted)">Vincula Gmail, Outlook o Apple Mail para enviarte copias de seguridad. Sin servidores: el archivo se descarga y se abre la redacción en tu proveedor.</p>
        </div>
        <span className="rounded-full bg-(--bg-tertiary) px-2.5 py-1 text-[11px] font-semibold text-(--muted)">
          {links.length} de {EMAIL_PROVIDERS.length} vinculados
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
                    {linked ? "Vinculado" : "No vinculado"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-(--muted)">{provider.tagline}</p>
              {link ? (
                <div className="min-w-0 rounded-lg bg-(--bg-secondary) px-2.5 py-2">
                  <p className="truncate text-xs font-medium text-(--text-primary)">{link.email}</p>
                  <p className="mt-0.5 text-[11px] text-(--muted)">
                    {link.lastSentAt ? `Último envío: ${new Date(link.lastSentAt).toLocaleString()}` : "Aún no has enviado copias"}
                  </p>
                </div>
              ) : null}
              <div className="mt-auto flex flex-wrap gap-2">
                {linked ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => sendBackup(provider.id)}>
                      <Send className="h-3.5 w-3.5" aria-hidden />
                      Enviar copia
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => unlink(provider.id)}>
                      <Unlink className="h-3.5 w-3.5" aria-hidden />
                      Desvincular
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => openLink(provider.id)}>
                    <Link2 className="h-3.5 w-3.5" aria-hidden />
                    Vincular {provider.name}
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
          title={linkingProvider ? `Vincular ${linkingProvider.name}` : "Vincular correo"}
          subtitle="Usaremos esta dirección para abrir la redacción con tu copia."
          onClose={closeLink}
        />
        <ModalBody>
          {formError ? (
            <div role="alert" className="rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">
              {formError}
            </div>
          ) : null}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">
            Tu correo de {linkingProvider?.name ?? "la cuenta"}
            <Input
              id="email-link-address"
              type="email"
              value={draftEmail}
              onChange={(event) => setDraftEmail(event.target.value)}
              placeholder="tu@correo.com"
            />
          </label>
          <p className="text-[11px] text-(--muted)">Al vincular aceptas que la copia se envíe a esta dirección mediante tu proveedor.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={closeLink}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmLink}>
            Vincular
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
