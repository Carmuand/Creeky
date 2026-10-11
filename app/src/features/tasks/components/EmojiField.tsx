import { Suspense, lazy, useState } from "react";
import { Categories, EmojiStyle, Theme as PickerTheme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { Input } from "@/components/ui/Input";
import { useTheme } from "@/hooks/useTheme";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { EMOJI_GRID } from "@/types/creeky";

/**
 * Full emoji picker, code-split so its data only loads when opened.
 */
const EmojiPicker = lazy(() => import("emoji-picker-react"));

/**
 * Message key of the name shown for each picker category.
 */
const CATEGORY_KEYS: { category: Categories; nameKey: MessageKey }[] = [
  { category: Categories.SUGGESTED, nameKey: "emoji.picker.recent" },
  { category: Categories.SMILEYS_PEOPLE, nameKey: "emoji.picker.people" },
  { category: Categories.ANIMALS_NATURE, nameKey: "emoji.picker.nature" },
  { category: Categories.FOOD_DRINK, nameKey: "emoji.picker.food" },
  { category: Categories.TRAVEL_PLACES, nameKey: "emoji.picker.travel" },
  { category: Categories.ACTIVITIES, nameKey: "emoji.picker.activities" },
  { category: Categories.OBJECTS, nameKey: "emoji.picker.objects" },
  { category: Categories.SYMBOLS, nameKey: "emoji.picker.symbols" },
  { category: Categories.FLAGS, nameKey: "emoji.picker.flags" },
];

/**
 * Properties for the {@link EmojiField} component.
 */
interface EmojiFieldProps {
  /** Selected emoji. */
  value: string;
  /** Called with the emoji picked by the user. */
  onChange: (emoji: string) => void;
}

/**
 * Emoji selector for list icons. It keeps the curated Creeky shortcuts and
 * adds the complete emoji catalog from emoji-picker-react behind a tab.
 *
 * @param props - Component properties.
 * @returns The emoji selector.
 */
export function EmojiField({ value, onChange }: EmojiFieldProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [tab, setTab] = useState<"quick" | "all">("quick");
  const [filter, setFilter] = useState("");

  const tabClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "bg-(--accent) border-(--accent) text-white" : "border-(--border-medium) bg-(--bg-primary) text-(--muted) hover:border-(--accent) hover:text-(--accent)"}`;

  const query = filter.trim().toLowerCase();

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-(--text-soft)">{t("emoji.label")}</label>
      <div className="flex items-center gap-2.5">
        <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-(--bg-secondary) text-2xl">{value}</span>
        <div className="flex gap-1.5" role="tablist" aria-label={t("emoji.label")}>
          <button type="button" role="tab" aria-selected={tab === "quick"} className={tabClass(tab === "quick")} onClick={() => setTab("quick")}>{t("emoji.tab.quick")}</button>
          <button type="button" role="tab" aria-selected={tab === "all"} className={tabClass(tab === "all")} onClick={() => setTab("all")}>{t("emoji.tab.all")}</button>
        </div>
        {tab === "quick" ? <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t("emoji.search")} className="flex-1" /> : null}
      </div>
      {tab === "quick" ? (
        <div className="grid max-h-47.5 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-(--border-light) bg-(--bg-secondary) p-2">
          {EMOJI_GRID.map((group) => {
            const category = t(group.catKey);
            const hit = group.items.filter((emoji) => !query || emoji.includes(filter.trim()) || category.toLowerCase().includes(query));
            if (!hit.length) return null;
            return (
              <div key={group.catKey} className="contents">
                <div className="col-span-8 pt-1.5 text-[11px] font-bold uppercase tracking-widest text-(--muted)">{category}</div>
                {hit.map((emoji) => <button key={emoji} type="button" onClick={() => onChange(emoji)} className={`rounded-lg p-1 text-[20px] transition-colors ${emoji === value ? "bg-(--accent-light) ring-2 ring-(--accent)" : "hover:bg-(--bg-hover)"}`}>{emoji}</button>)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-(--border-light)">
          <Suspense fallback={<p className="p-4 text-center text-xs text-(--muted)">{t("common.loading")}</p>}>
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => onChange(data.emoji)}
              theme={theme === "dark" ? PickerTheme.DARK : PickerTheme.LIGHT}
              emojiStyle={EmojiStyle.NATIVE}
              categories={CATEGORY_KEYS.map(({ category, nameKey }) => ({ category, name: t(nameKey) }))}
              searchPlaceholder={t("emoji.search")}
              previewConfig={{ showPreview: false }}
              skinTonesDisabled
              lazyLoadEmojis
              width="100%"
              height={300}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
