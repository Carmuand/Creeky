import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Grid3x3, List, Search, Filter, X } from "lucide-react";

/**
 * Calendar event rendered by the event manager.
 */
export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  attendees?: string[];
  tags?: string[];
  _bgColor?: string;
  _taskId?: string;
  _iso?: string;
}

/**
 * Properties for the {@link EventManager} component.
 */
export interface EventManagerProps {
  events?: Event[];
  onEventCreate?: (event: Omit<Event, "id">) => void;
  onEventUpdate?: (id: string, event: Partial<Event>) => void;
  onEventDelete?: (id: string) => void;
  categories?: string[];
  colors?: EventColor[];
  defaultView?: "month" | "week" | "day" | "list" | "year";
  className?: string;
  availableTags?: string[];
}

/**
 * Color option available for events.
 */
export interface EventColor {
  /** Message key of the color name. */
  nameKey: MessageKey;
  /** Stable color identifier. */
  value: string;
  /** Background utility class. */
  bg: string;
  /** Text utility class. */
  text: string;
}

const defaultColors: EventColor[] = [
  { nameKey: "color.purple", value: "purple", bg: "bg-[var(--accent)]", text: "text-white" },
  { nameKey: "color.green", value: "green", bg: "bg-[var(--secondary)]", text: "text-white" },
  { nameKey: "color.blue", value: "blue", bg: "bg-[#3b82f6]", text: "text-white" },
  { nameKey: "color.orange", value: "orange", bg: "bg-[#f59e0b]", text: "text-white" },
  { nameKey: "color.pink", value: "pink", bg: "bg-[#ec4899]", text: "text-white" },
  { nameKey: "color.red", value: "red", bg: "bg-[#ef4444]", text: "text-white" },
];

/**
 * Message key of the short name of each weekday, Sunday first.
 */
const WEEKDAY_KEYS: MessageKey[] = ["weekday.abbr.0", "weekday.abbr.1", "weekday.abbr.2", "weekday.abbr.3", "weekday.abbr.4", "weekday.abbr.5", "weekday.abbr.6"];

/**
 * Small rounded label.
 *
 * @param props - Badge content, variant and span attributes.
 * @returns The badge.
 */
function Badge({ children, variant = "secondary", className = "", ...props }: { children: React.ReactNode; variant?: "secondary" | "outline" | "default"; className?: string } & React.HTMLAttributes<HTMLSpanElement>) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
  const variants = {
    secondary: "bg-(--bg-tertiary) border-(--border-light) text-(--muted)",
    outline: "bg-transparent border-(--border-medium) text-(--muted)",
    default: "bg-(--accent) border-(--accent) text-white",
  };
  return <span className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</span>;
}

/**
 * Bordered surface used by the calendar layouts.
 *
 * @param props - Card content and div attributes.
 * @returns The card.
 */
function Card({ children, className = "", ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-sm ${className}`} {...props}>{children}</div>;
}

/**
 * Form field label.
 *
 * @param props - Label content and label attributes.
 * @returns The label.
 */
function Label({ children, htmlFor, className = "", ...props }: { children: React.ReactNode; htmlFor?: string; className?: string } & React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label htmlFor={htmlFor} className={`block text-xs font-medium text-(--text-soft) ${className}`} {...props}>{children}</label>;
}

/**
 * Calendar with year, month, week, day and list layouts, filters and an
 * event dialog.
 *
 * @param props - Component properties.
 * @returns The event manager.
 */
export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  categories = ["Meeting", "Task", "Reminder", "Personal"],
  colors = defaultColors,
  defaultView = "month",
  className,
  availableTags = ["Important", "Urgent", "Work", "Personal", "Team", "Client"],
}: EventManagerProps) {
  const { t, locale } = useI18n();
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "list" | "year">(defaultView as never);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: categories[0],
    tags: [],
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  useEffect(() => {
    if (categories.length && !categories.includes(newEvent.category || "")) {
      setNewEvent((prev) => ({ ...prev, category: categories[0] }));
    }
  }, [categories, newEvent.category]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (selectedColors.length > 0 && !selectedColors.includes(event.color)) return false;
      if (selectedTags.length > 0) {
        const hasMatchingTag = event.tags?.some((tag) => selectedTags.includes(tag));
        if (!hasMatchingTag) return false;
      }
      if (selectedCategories.length > 0 && event.category && !selectedCategories.includes(event.category)) return false;
      return true;
    });
  }, [events, searchQuery, selectedColors, selectedTags, selectedCategories]);

  const hasActiveFilters = selectedColors.length > 0 || selectedTags.length > 0 || selectedCategories.length > 0;

  const clearFilters = () => {
    setSelectedColors([]);
    setSelectedTags([]);
    setSelectedCategories([]);
    setSearchQuery("");
  };

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return;
    const event: Event = {
      id: Math.random().toString(36).substr(2, 9),
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color || colors[0].value,
      category: newEvent.category,
      attendees: newEvent.attendees,
      tags: newEvent.tags || [],
    };
    setEvents((prev) => [...prev, event]);
    onEventCreate?.(event);
    setIsDialogOpen(false);
    setIsCreating(false);
    setNewEvent({ title: "", description: "", color: colors[0].value, category: categories[0], tags: [] });
  }, [newEvent, colors, categories, onEventCreate]);

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return;
    setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? selectedEvent : e)));
    onEventUpdate?.(selectedEvent.id, selectedEvent);
    setIsDialogOpen(false);
    setSelectedEvent(null);
  }, [selectedEvent, onEventUpdate]);

  const handleDeleteEvent = useCallback(
    (id: string) => {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      onEventDelete?.(id);
      setIsDialogOpen(false);
      setSelectedEvent(null);
    },
    [onEventDelete],
  );

  const handleDragStart = useCallback((event: Event) => setDraggedEvent(event), []);
  const handleDragEnd = useCallback(() => setDraggedEvent(null), []);

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return;
      const duration = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime();
      const newStartTime = new Date(date);
      if (hour !== undefined) newStartTime.setHours(hour, 0, 0, 0);
      const newEndTime = new Date(newStartTime.getTime() + duration);
      const updatedEvent = { ...draggedEvent, startTime: newStartTime, endTime: newEndTime };
      setEvents((prev) => prev.map((e) => (e.id === draggedEvent.id ? updatedEvent : e)));
      onEventUpdate?.(draggedEvent.id, updatedEvent);
      setDraggedEvent(null);
    },
    [draggedEvent, onEventUpdate],
  );

  const navigateDate = useCallback(
    (direction: "prev" | "next") => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        if (view === "year") newDate.setFullYear(prev.getFullYear() + (direction === "next" ? 1 : -1));
        else if (view === "month") newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1));
        else if (view === "week") newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7));
        else if (view === "day") newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1));
        return newDate;
      });
    },
    [view],
  );

  const getColorClasses = useCallback(
    (colorValue: string) => colors.find((c) => c.value === colorValue) || colors[0],
    [colors],
  );

  const toggleTag = (tag: string, isCreating: boolean) => {
    if (isCreating) {
      setNewEvent((prev) => ({ ...prev, tags: prev.tags?.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...(prev.tags || []), tag] }));
    } else {
      setSelectedEvent((prev) => prev ? { ...prev, tags: prev.tags?.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...(prev.tags || []), tag] } : null);
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
      <div className="flex flex-col gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--accent) to-(--secondary)" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <h2 className="text-xl font-semibold sm:text-2xl text-(--text)">
              {view === "year" && currentDate.getFullYear().toString()}
              {view === "month" && currentDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              {view === "week" && t("calendar.weekOf", { date: currentDate.toLocaleDateString(locale, { month: "short", day: "numeric" }) })}
              {view === "day" && currentDate.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {view === "list" && t("calendar.allEvents")}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => navigateDate("prev")} className="flex h-8 w-8 items-center justify-center rounded-md border border-(--border-medium) bg-(--bg-primary) hover:bg-(--bg-hover)"><ChevronLeft className="h-4 w-4" /></button>
              <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>{t("common.today")}</Button>
              <button onClick={() => navigateDate("next")} className="flex h-8 w-8 items-center justify-center rounded-md border border-(--border-medium) bg-(--bg-primary) hover:bg-(--bg-hover)"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <Button onClick={() => { setIsCreating(true); setIsDialogOpen(true); }} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />{t("calendar.newEvent")}</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--accent)">{t("calendar.viewColon")}</span>
          <div className="flex flex-wrap gap-1 rounded-full bg-(--bg-tertiary) p-1 border border-(--border-light) w-fit">
            <button onClick={() => setView("year")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === "year" ? "bg-(--accent) text-white shadow-sm" : "text-(--muted) hover:text-(--text)"}`}><Calendar className="h-3 w-3" />{t("calendar.view.year")}</button>
            <button onClick={() => setView("month")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === "month" ? "bg-(--accent) text-white shadow-sm" : "text-(--muted) hover:text-(--text)"}`}><Calendar className="h-3 w-3" />{t("calendar.view.month")}</button>
            <button onClick={() => setView("week")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === "week" ? "bg-(--secondary) text-white shadow-sm" : "text-(--muted) hover:text-(--text)"}`}><Grid3x3 className="h-3 w-3" />{t("calendar.view.week")}</button>
            <button onClick={() => setView("day")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === "day" ? "bg-(--secondary) text-white shadow-sm" : "text-(--muted) hover:text-(--text)"}`}><Clock className="h-3 w-3" />{t("calendar.view.day")}</button>
            <button onClick={() => setView("list")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${view === "list" ? "bg-(--accent) text-white shadow-sm" : "text-(--muted) hover:text-(--text)"}`}><List className="h-3 w-3" />{t("filters.list")}</button>
          </div>
          <span className="ml-auto hidden sm:flex items-center gap-1 text-xs text-(--muted)"><Calendar className="h-3 w-3" />{t("calendar.eventCount", { count: filteredEvents.length })}</span>
        </div>
        <div className="sm:hidden w-full">
          <Select value={view} onChange={(v) => setView(v as never)} options={[{ value: "year", label: t("calendar.view.year") }, { value: "month", label: t("calendar.view.month") }, { value: "week", label: t("calendar.view.week") }, { value: "day", label: t("calendar.view.day") }, { value: "list", label: t("filters.list") }]} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-(--border-light) bg-(--bg-primary) p-3 shadow-sm relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-(--secondary) to-(--accent)" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--secondary)">{t("calendar.filtersColon")}</span>
          <span className="text-xs text-(--muted)">{t("calendar.filteredCount", { shown: filteredEvents.length, total: events.length })}</span>
          {hasActiveFilters && <button onClick={clearFilters} className="ml-auto flex items-center gap-1 text-xs text-(--secondary) hover:underline"><X className="h-3 w-3" />{t("calendar.clearFilters")}</button>}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)" />
          <Input placeholder={t("calendar.search.placeholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 flex items-center justify-center rounded-md hover:bg-(--bg-hover)"><X className="h-4 w-4" /></button>}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 overflow-visible">
          <Dropdown trigger={<Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap"><Filter className="h-4 w-4" />{t("calendar.filter.colors")} {selectedColors.length > 0 && <Badge className="ml-1 bg-(--accent) text-white border-(--accent)">{selectedColors.length}</Badge>}</Button>}>
            {colors.map((color) => (
              <DropdownItem key={color.value} onClick={() => setSelectedColors((prev) => prev.includes(color.value) ? prev.filter((c) => c !== color.value) : [...prev, color.value])}>
                <div className="flex items-center gap-2"><div className={`h-3 w-3 rounded ${color.bg}`} />{t(color.nameKey)} {selectedColors.includes(color.value) ? "✓" : ""}</div>
              </DropdownItem>
            ))}
          </Dropdown>
          <Dropdown trigger={<Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap"><Filter className="h-4 w-4" />{t("task.tags")} {selectedTags.length > 0 && <Badge className="ml-1 bg-(--secondary) text-white border-(--secondary)">{selectedTags.length}</Badge>}</Button>}>
            {availableTags.map((tag) => (
              <DropdownItem key={tag} onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}>{tag} {selectedTags.includes(tag) ? "✓" : ""}</DropdownItem>
            ))}
          </Dropdown>
          <Dropdown trigger={<Button variant="secondary" size="sm" className="gap-2 whitespace-nowrap"><Filter className="h-4 w-4" />{t("calendar.filter.categories")} {selectedCategories.length > 0 && <Badge className="ml-1 bg-(--accent) text-white border-(--accent)">{selectedCategories.length}</Badge>}</Button>}>
            {categories.map((cat) => (
              <DropdownItem key={cat} onClick={() => setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat])}>{cat} {selectedCategories.includes(cat) ? "✓" : ""}</DropdownItem>
            ))}
          </Dropdown>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 whitespace-nowrap hidden sm:flex"><X className="h-4 w-4" />{t("common.clear")}</Button>}
        </div>
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-(--border-light)">
            <span className="text-xs font-medium text-(--muted)">{t("calendar.activeColon")}</span>
            {selectedColors.map((colorValue) => {
              const color = getColorClasses(colorValue);
              return <Badge key={colorValue} variant="default" className="gap-1 bg-(--accent)"><div className={`h-2 w-2 rounded-full ${color.bg} border border-white/30`} />{t(color.nameKey)}<button onClick={() => setSelectedColors((prev) => prev.filter((c) => c !== colorValue))} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button></Badge>;
            })}
            {selectedTags.map((tag) => <Badge key={tag} variant="default" className="gap-1 bg-(--secondary)"><span>{tag}</span><button onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button></Badge>)}
            {selectedCategories.map((cat) => <Badge key={cat} className="gap-1 border-(--accent-border) bg-(--accent-light) text-(--accent)">{cat}<button onClick={() => setSelectedCategories((prev) => prev.filter((c) => c !== cat))} className="ml-1"><X className="h-3 w-3" /></button></Badge>)}
          </div>
        )}
      </div>

      {view === "year" && <YearView currentDate={currentDate} events={filteredEvents} onEventClick={(e) => { setSelectedEvent(e); setIsDialogOpen(true); }} onMonthClick={(date) => { setCurrentDate(date); setView("month"); }} getColorClasses={getColorClasses} />}
      {view === "month" && <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={(e) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "week" && <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={(e) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "day" && <DayView currentDate={currentDate} events={filteredEvents} onEventClick={(e) => { setSelectedEvent(e); setIsDialogOpen(true); }} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDrop={handleDrop} getColorClasses={getColorClasses} />}
      {view === "list" && <ListView events={filteredEvents} onEventClick={(e) => { setSelectedEvent(e); setIsDialogOpen(true); }} getColorClasses={getColorClasses} />}

      <Modal open={isDialogOpen} onClose={() => { setIsDialogOpen(false); setIsCreating(false); setSelectedEvent(null); }} className="w-full max-w-md max-h-[90vh]">
        <ModalHeader title={isCreating ? t("calendar.dialog.create") : t("calendar.dialog.details")} onClose={() => { setIsDialogOpen(false); setIsCreating(false); setSelectedEvent(null); }} />
        <ModalBody className="gap-4">
          <div className="flex flex-col gap-1.5"><Label htmlFor="title">{t("calendar.field.title")}</Label><Input id="title" value={isCreating ? newEvent.title : selectedEvent?.title || ""} onChange={(e) => isCreating ? setNewEvent((prev) => ({ ...prev, title: e.target.value })) : setSelectedEvent((prev) => (prev ? { ...prev, title: e.target.value } : null))} placeholder={t("calendar.field.title.placeholder")} /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="description">{t("task.description")}</Label><Textarea id="description" value={isCreating ? newEvent.description : selectedEvent?.description || ""} onChange={(e) => isCreating ? setNewEvent((prev) => ({ ...prev, description: e.target.value })) : setSelectedEvent((prev) => (prev ? { ...prev, description: e.target.value } : null))} placeholder={t("task.description")} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>{t("calendar.field.start")}</Label><Input type="datetime-local" value={isCreating ? (newEvent.startTime ? new Date(newEvent.startTime.getTime() - newEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "") : selectedEvent ? new Date(selectedEvent.startTime.getTime() - selectedEvent.startTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => { const d = new Date(e.target.value); isCreating ? setNewEvent((prev) => ({ ...prev, startTime: d })) : setSelectedEvent((prev) => (prev ? { ...prev, startTime: d } : null)); }} /></div>
            <div className="flex flex-col gap-1.5"><Label>{t("calendar.field.end")}</Label><Input type="datetime-local" value={isCreating ? (newEvent.endTime ? new Date(newEvent.endTime.getTime() - newEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "") : selectedEvent ? new Date(selectedEvent.endTime.getTime() - selectedEvent.endTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""} onChange={(e) => { const d = new Date(e.target.value); isCreating ? setNewEvent((prev) => ({ ...prev, endTime: d })) : setSelectedEvent((prev) => (prev ? { ...prev, endTime: d } : null)); }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>{t("calendar.field.category")}</Label><Select value={isCreating ? (newEvent.category || "") : (selectedEvent?.category || "")} onChange={(v) => isCreating ? setNewEvent((prev) => ({ ...prev, category: v })) : setSelectedEvent((prev) => (prev ? { ...prev, category: v } : null))} options={categories.map((c) => ({ value: c, label: c }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>{t("calendar.field.color")}</Label><Select value={isCreating ? (newEvent.color || "") : (selectedEvent?.color || "")} onChange={(v) => isCreating ? setNewEvent((prev) => ({ ...prev, color: v })) : setSelectedEvent((prev) => (prev ? { ...prev, color: v } : null))} options={colors.map((c) => ({ value: c.value, label: t(c.nameKey) }))} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>{t("task.tags")}</Label><div className="flex flex-wrap gap-2">{availableTags.map((tag) => { const isSelected = isCreating ? newEvent.tags?.includes(tag) : selectedEvent?.tags?.includes(tag); return <Badge key={tag} variant={isSelected ? "default" : "outline"} className={`cursor-pointer hover:scale-105 ${isSelected ? "bg-(--accent) text-white border-(--accent)" : ""}`} onClick={() => toggleTag(tag, isCreating)}>{tag}</Badge>; })}</div></div>
        </ModalBody>
        <ModalFooter>
          {!isCreating && <Button variant="danger" onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}>{t("common.delete")}</Button>}
          <Button variant="secondary" onClick={() => { setIsDialogOpen(false); setIsCreating(false); setSelectedEvent(null); }}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={isCreating ? handleCreateEvent : handleUpdateEvent}>{isCreating ? t("common.create") : t("common.save")}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/**
 * Draggable event chip with a hover card.
 *
 * @param props - Event, callbacks and visual variant.
 * @returns The event card.
 */
function EventCard({ event, onEventClick, onDragStart, onDragEnd, getColorClasses, variant = "default" }: { event: Event; onEventClick: (event: Event) => void; onDragStart: (event: Event) => void; onDragEnd: () => void; getColorClasses: (color: string) => { bg: string; text: string }; variant?: "default" | "compact" | "detailed" }) {
  const { locale } = useI18n();
  const [isHovered, setIsHovered] = useState(false);
  const colorClasses = getColorClasses(event.color);
  const bgStyle = (event as unknown as { _bgColor?: string })._bgColor ? { backgroundColor: (event as unknown as { _bgColor: string })._bgColor } : undefined;
  const bgClass = bgStyle ? "" : colorClasses.bg;
  const formatTime = (date: Date) => date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const getDuration = () => {
    const diff = event.endTime.getTime() - event.startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (variant === "compact") {
    return (
      <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="relative cursor-pointer">
        <div style={bgStyle} className={`rounded px-1.5 py-0.5 text-xs font-medium truncate ${bgClass} text-white ${isHovered ? "scale-105 shadow-lg z-10" : ""}`}>{event.title}</div>
        {isHovered && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64">
            <Card className="border-2 p-3 shadow-xl">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-sm leading-tight text-(--text)">{event.title}</h4><div className={`h-3 w-3 rounded-full shrink-0 ${colorClasses.bg}`} /></div>
                {event.description && <p className="text-xs text-(--muted) line-clamp-2">{event.description}</p>}
                <div className="flex items-center gap-1 text-xs text-(--muted)"><Clock className="h-3 w-3" /><span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span><span className="text-[10px]">({getDuration()})</span></div>
                <div className="flex flex-wrap gap-1">{event.category && <Badge>{event.category}</Badge>}{event.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }
  if (variant === "detailed") {
    return (
      <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} style={bgStyle} className={`cursor-pointer rounded-lg p-3 ${bgClass} text-white ${isHovered ? "scale-[1.03] shadow-2xl ring-2 ring-white/50" : ""}`}>
        <div className="font-semibold">{event.title}</div>
        {event.description && <div className="mt-1 text-sm opacity-90 line-clamp-2">{event.description}</div>}
        <div className="mt-2 flex items-center gap-2 text-xs opacity-80"><Clock className="h-3 w-3" />{formatTime(event.startTime)} - {formatTime(event.endTime)}</div>
        {isHovered && <div className="mt-2 flex flex-wrap gap-1">{event.category && <Badge>{event.category}</Badge>}{event.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>}
      </div>
    );
  }
  return (
    <div draggable onDragStart={() => onDragStart(event)} onDragEnd={onDragEnd} onClick={() => onEventClick(event)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className="relative">
      <div style={bgStyle} className={`cursor-pointer rounded px-2 py-1 text-xs font-medium ${bgClass} text-white ${isHovered ? "scale-105 shadow-lg z-10" : ""}`}><div className="truncate">{event.title}</div></div>
      {isHovered && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72">
          <Card className="border-2 p-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2"><h4 className="font-semibold leading-tight text-(--text)">{event.title}</h4><div className={`h-4 w-4 rounded-full shrink-0 ${colorClasses.bg}`} /></div>
              {event.description && <p className="text-sm text-(--muted)">{event.description}</p>}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-(--muted)"><Clock className="h-3.5 w-3.5" /><span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span><span className="text-[10px]">({getDuration()})</span></div>
                <div className="flex flex-wrap gap-1">{event.category && <Badge>{event.category}</Badge>}{event.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Month grid with up to three events per day.
 *
 * @param props - Displayed date, events and callbacks.
 * @returns The month layout.
 */
function MonthView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: { currentDate: Date; events: Event[]; onEventClick: (event: Event) => void; onDragStart: (event: Event) => void; onDragEnd: () => void; onDrop: (date: Date) => void; getColorClasses: (color: string) => { bg: string; text: string } }) {
  const { t, locale } = useI18n();
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const days = [];
  const currentDay = new Date(startDate);
  for (let i = 0; i < 42; i++) { days.push(new Date(currentDay)); currentDay.setDate(currentDay.getDate() + 1); }
  const getEventsForDay = (date: Date) => events.filter((event) => { const d = new Date(event.startTime); return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); });
  return (
    <>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-(--border-light)">
          {WEEKDAY_KEYS.map((dayKey) => <div key={dayKey} className="border-r border-(--border-light) p-2 text-center text-xs font-medium last:border-r-0 text-(--muted)"><span>{t(dayKey)}</span></div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`min-h-20 border-b border-r border-(--border-light) p-1 sm:min-h-24 sm:p-2 ${!isCurrentMonth ? "bg-(--bg-secondary)" : "bg-(--bg-primary)"} hover:bg-(--bg-hover)`} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(day)}>
                <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-xs sm:h-6 sm:w-6 sm:text-sm ${isToday ? "bg-(--accent) text-white font-semibold" : "text-(--muted)"}`}>{day.getDate()}</div>
                <div className="space-y-1">{dayEvents.slice(0, 3).map((event) => <EventCard key={event.id} event={event} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} variant="compact" />)}{dayEvents.length > 3 && <button onClick={() => setExpandedDay(day)} className="text-[10px] font-medium text-(--secondary) hover:underline hover:text-(--secondary-hover)">{t("calendar.more", { count: dayEvents.length - 3 })}</button>}</div>
              </div>
            );
          })}
        </div>
      </Card>
      {expandedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setExpandedDay(null)}>
          <div className="w-full max-w-sm rounded-xl border border-(--border-light) bg-(--bg-primary) shadow-xl max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-(--border-light) px-4 py-3">
              <h4 className="font-semibold text-sm text-(--text)">{expandedDay.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}</h4>
              <button onClick={() => setExpandedDay(null)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-(--bg-hover)"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {getEventsForDay(expandedDay).map((event) => {
                const bg = (event as unknown as { _bgColor?: string })._bgColor || getColorClasses(event.color).bg;
                const isHex = bg.startsWith("#");
                return (
                  <div key={event.id} onClick={() => { setExpandedDay(null); onEventClick(event); }} className="flex items-center gap-2 rounded-lg border border-(--border-light) bg-(--bg-secondary) p-2.5 hover:border-(--accent) cursor-pointer">
                    <span className="h-3 w-3 rounded-full shrink-0" style={isHex ? { backgroundColor: bg } : undefined} />
                    <div className="flex-1 min-w-0"><div className="truncate text-sm font-medium text-(--text)">{event.title}</div><div className="text-xs text-(--muted)">{event.startTime.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} • {event.category}</div></div>
                  </div>
                );
              })}
              {getEventsForDay(expandedDay).length === 0 && <p className="py-4 text-center text-sm text-(--muted)">{t("calendar.noEvents")}</p>}
            </div>
            <div className="border-t border-(--border-light) p-3 flex justify-end"><Button variant="secondary" size="sm" onClick={() => setExpandedDay(null)}>{t("common.close")}</Button></div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Week grid with one row per hour.
 *
 * @param props - Displayed date, events and callbacks.
 * @returns The week layout.
 */
function WeekView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: { currentDate: Date; events: Event[]; onEventClick: (event: Event) => void; onDragStart: (event: Event) => void; onDragEnd: () => void; onDrop: (date: Date, hour: number) => void; getColorClasses: (color: string) => { bg: string; text: string } }) {
  const { t, locale } = useI18n();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const getEventsForDayAndHour = (date: Date, hour: number) => events.filter((event) => { const d = new Date(event.startTime); return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear() && d.getHours() === hour; });
  return (
    <Card className="overflow-auto">
      <div className="grid grid-cols-8 border-b border-(--border-light)">
        <div className="border-r border-(--border-light) p-2 text-center text-xs font-medium text-(--muted)">{t("task.time")}</div>
        {weekDays.map((day) => <div key={day.toISOString()} className="border-r border-(--border-light) p-2 text-center text-xs font-medium last:border-r-0 text-(--muted)"><div>{day.toLocaleDateString(locale, { weekday: "short" })}</div><div className="text-[10px]">{day.toLocaleDateString(locale, { month: "short", day: "numeric" })}</div></div>)}
      </div>
      <div className="grid grid-cols-8">
        {hours.map((hour) => (
          <>
            <div key={`time-${hour}`} className="border-b border-r border-(--border-light) p-1 text-[10px] text-(--muted) sm:p-2 sm:text-xs">{hour.toString().padStart(2, "0")}:00</div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDayAndHour(day, hour);
              return <div key={`${day.toISOString()}-${hour}`} className="min-h-12 border-b border-r border-(--border-light) p-0.5 hover:bg-(--bg-hover) last:border-r-0 sm:min-h-16 sm:p-1" onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(day, hour)}><div className="space-y-1">{dayEvents.map((event) => <EventCard key={event.id} event={event} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} variant="default" />)}</div></div>;
            })}
          </>
        ))}
      </div>
    </Card>
  );
}

/**
 * Single day layout with one row per hour.
 *
 * @param props - Displayed date, events and callbacks.
 * @returns The day layout.
 */
function DayView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop, getColorClasses }: { currentDate: Date; events: Event[]; onEventClick: (event: Event) => void; onDragStart: (event: Event) => void; onDragEnd: () => void; onDrop: (date: Date, hour: number) => void; getColorClasses: (color: string) => { bg: string; text: string } }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const getEventsForHour = (hour: number) => events.filter((event) => { const d = new Date(event.startTime); return d.getDate() === currentDate.getDate() && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear() && d.getHours() === hour; });
  return (
    <Card className="overflow-auto">
      <div className="space-y-0">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div key={hour} className="flex border-b border-(--border-light) last:border-b-0" onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(currentDate, hour)}>
              <div className="w-14 shrink-0 border-r border-(--border-light) p-2 text-xs text-(--muted) sm:w-20 sm:p-3 sm:text-sm">{hour.toString().padStart(2, "0")}:00</div>
              <div className="min-h-16 flex-1 p-1 hover:bg-(--bg-hover) sm:min-h-20 sm:p-2"><div className="space-y-2">{hourEvents.map((event) => <EventCard key={event.id} event={event} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} getColorClasses={getColorClasses} variant="detailed" />)}</div></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Year layout with twelve mini months.
 *
 * @param props - Displayed date, events and callbacks.
 * @returns The year layout.
 */
function YearView({ currentDate, events, onEventClick: _onEventClick, onMonthClick, getColorClasses: _getColorClasses }: { currentDate: Date; events: Event[]; onEventClick: (event: Event) => void; onMonthClick: (date: Date) => void; getColorClasses: (color: string) => { bg: string; text: string } }) {
  void _onEventClick; void _getColorClasses;
  const { locale } = useI18n();
  const year = currentDate.getFullYear();
  const getEventsForDay = (date: Date) => events.filter((e) => { const d = new Date(e.startTime); return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear(); });
  return (
    <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-2">
      {Array.from({ length: 12 }, (_, m) => {
        const first = new Date(year, m, 1);
        const sd = (first.getDay() + 6) % 7;
        const nd = new Date(year, m + 1, 0).getDate();
        return (
          <button key={m} onClick={() => onMonthClick(new Date(year, m, 1))} className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-2.5 text-left hover:border-(--accent) hover:shadow-sm transition-colors w-full">
            <b className="block text-xs capitalize mb-1.5 text-(--accent)">{new Date(year, m, 1).toLocaleDateString(locale, { month: "long" })}</b>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: sd }).map((_, i) => <span key={`e-${i}`} />)}
              {Array.from({ length: nd }, (_, d) => {
                const date = new Date(year, m, d + 1);
                const hasEv = getEventsForDay(date).length > 0;
                const isToday = date.toDateString() === new Date().toDateString();
                return <span key={d} className={`flex aspect-square items-center justify-center rounded-full text-[11px] ${hasEv ? "bg-(--secondary) font-bold text-white" : "text-(--muted)"} ${isToday ? "ring-1 ring-(--accent) ring-offset-1" : ""}`}>{d + 1}</span>;
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Chronological list of events grouped by day.
 *
 * @param props - Events and callbacks.
 * @returns The list layout.
 */
function ListView({ events, onEventClick, getColorClasses }: { events: Event[]; onEventClick: (event: Event) => void; getColorClasses: (color: string) => { bg: string; text: string } }) {
  const { t, locale } = useI18n();
  const sortedEvents = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const groupedEvents = sortedEvents.reduce((acc, event) => {
    const dateKey = event.startTime.toLocaleDateString(locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
  return (
    <Card className="p-3 sm:p-4">
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date} className="space-y-3">
            <h3 className="text-xs font-semibold text-(--muted) sm:text-sm">{date}</h3>
            <div className="space-y-2">
              {dateEvents.map((event) => {
                const colorClasses = getColorClasses(event.color);
                return (
                  <div key={event.id} onClick={() => onEventClick(event)} className="group cursor-pointer rounded-lg border border-(--border-light) bg-(--bg-primary) p-3 sm:p-4 hover:shadow-md hover:border-(--accent) hover:scale-[1.01] transition-all">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${colorClasses.bg}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0"><h4 className="font-semibold text-sm group-hover:text-(--accent) sm:text-base truncate">{event.title}</h4>{event.description && <p className="mt-1 text-xs text-(--muted) sm:text-sm line-clamp-2">{event.description}</p>}</div>
                          <div className="flex flex-wrap gap-1">{event.category && <Badge>{event.category}</Badge>}</div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-(--muted) sm:gap-4 sm:text-xs">
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.startTime.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} - {event.endTime.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</div>
                          {event.tags && event.tags.length > 0 && <div className="flex flex-wrap gap-1">{event.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {sortedEvents.length === 0 && <div className="py-12 text-center text-sm text-(--muted) sm:text-base">{t("calendar.noEvents")}</div>}
      </div>
    </Card>
  );
}
