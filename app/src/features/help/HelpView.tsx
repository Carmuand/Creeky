import { useState, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";

/**
 * Help topics as pairs of title and description message keys.
 */
const ITEMS: [MessageKey, MessageKey][] = [
  ["help.start.title", "help.start.text"],
  ["help.shortcuts.title", "help.shortcuts.text"],
  ["help.segments.title", "help.segments.text"],
  ["help.schedule.title", "help.schedule.text"],
  ["help.clashes.title", "help.clashes.text"],
  ["help.philosophy.title", "help.philosophy.text"],
  ["help.privacy.title", "help.privacy.text"],
  ["help.colors.title", "help.colors.text"],
  ["help.faq.title", "help.faq.text"],
];

/**
 * Help view with filterable topic cards.
 *
 * @returns The help view.
 */
export function HelpView() {
  const { t: tr, language } = useI18n();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const items = ITEMS.map(([titleKey, textKey]) => [tr(titleKey), tr(textKey)] as [string, string]);
    const lq = q.toLowerCase();
    if (!lq) return items;
    return items.filter(([t, d]) => `${t} ${d}`.toLowerCase().includes(lq));
  }, [q, tr, language]);

  return (
    <section className="max-w-275 mx-auto flex flex-col gap-4" aria-label={tr("nav.help")}>
      <p className="text-sm text-(--muted)">{tr("help.intro")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-(--muted)">{tr("common.filterColon")}</span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("help.filter.placeholder")} className="max-w-70" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {filtered.map(([t, d], i) => (
          <div key={t} className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-5 shadow-sm">
            <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent) text-xs font-bold text-white">{String(i + 1).padStart(2, "0")}</span>
            <h4 className="mt-1 font-semibold">{t}</h4>
            <p className="mt-1 text-sm text-(--muted)">{d}</p>
          </div>
        ))}
        {!filtered.length ? <p className="col-span-full py-4 text-center text-sm text-(--muted)">{tr("help.empty")}</p> : null}
      </div>
    </section>
  );
}