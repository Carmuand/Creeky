import { useMemo } from "react";
import { EVENTS, Joyride, STATUS } from "react-joyride";
import type { EventData, Step } from "react-joyride";
import type { CreekyView } from "@/components/layout/Sidebar";
import { pushToast } from "@/hooks/useToast";
import { errorMessage, useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import { authApi } from "@/services/api";

/**
 * Definition of a tour stop.
 */
interface TourStop {
  /** CSS selector of the highlighted element, or `body` for a centered step. */
  target: string;
  /** Message key of the step title. */
  titleKey: MessageKey;
  /** Message key of the step text. */
  textKey: MessageKey;
  /** View opened when the step is shown, so the user sees what is described. */
  view?: CreekyView;
}

/**
 * Stops of the guided tour, in order.
 */
const TOUR_STOPS: TourStop[] = [
  { target: "body", titleKey: "tour.welcome.title", textKey: "tour.welcome.text" },
  { target: '[data-page="tasks"]', titleKey: "nav.tasks", textKey: "tour.tasks.text", view: "tasks" },
  { target: '[data-page="calendar"]', titleKey: "nav.calendar", textKey: "tour.calendar.text", view: "calendar" },
  { target: '[data-page="pomodoro"]', titleKey: "nav.pomodoro", textKey: "tour.pomodoro.text", view: "pomodoro" },
  { target: '[data-page="eisenhower"]', titleKey: "nav.eisenhower", textKey: "tour.eisenhower.text", view: "eisenhower" },
  { target: '[data-page="habits"]', titleKey: "nav.habits", textKey: "tour.habits.text", view: "habits" },
  { target: '[data-page="countdown"]', titleKey: "nav.countdown", textKey: "tour.countdown.text", view: "countdown" },
  { target: '[data-page="search"]', titleKey: "nav.search", textKey: "tour.search.text", view: "search" },
  { target: '[data-page="sync"]', titleKey: "nav.sync", textKey: "tour.sync.text", view: "sync" },
  { target: '[data-page="notifications"]', titleKey: "nav.notifications", textKey: "tour.notifications.text", view: "notifications" },
  { target: '[data-page="settings"]', titleKey: "nav.settings", textKey: "tour.settings.text", view: "settings" },
  { target: '[data-tour="theme"]', titleKey: "tour.theme.title", textKey: "tour.theme.text" },
  { target: '[data-tour="user-menu"]', titleKey: "tour.user.title", textKey: "tour.user.text", view: "tasks" },
  { target: "body", titleKey: "tour.done.title", textKey: "tour.done.text" },
];

/**
 * Properties for the {@link OnboardingTour} component.
 */
interface OnboardingTourProps {
  /** Whether the tour runs; true for users who have not finished or skipped it. */
  active: boolean;
  /** Opens a view while its step is shown. */
  onNavigate: (view: CreekyView) => void;
}

/**
 * Guided tour for new users built on React Joyride. It walks through every
 * section, can be skipped at any step and is repeatable from the settings.
 * Finishing or skipping it is recorded on the account by the backend.
 *
 * @param props - Component properties.
 * @returns The tour overlay, or nothing while inactive.
 */
export function OnboardingTour({ active, onNavigate }: OnboardingTourProps) {
  const { t, language } = useI18n();

  const steps = useMemo<Step[]>(
    () =>
      TOUR_STOPS.map((stop) => ({
        target: stop.target,
        title: t(stop.titleKey),
        content: t(stop.textKey),
        placement: stop.target === "body" ? "center" : "auto",
        isFixed: true,
      })),
    [t, language],
  );

  const handleEvent = (data: EventData) => {
    if (data.type === EVENTS.STEP_BEFORE) {
      const view = TOUR_STOPS[data.index]?.view;
      if (view) onNavigate(view);
    }
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      authApi.setOnboarded(true).catch((error: unknown) => pushToast(errorMessage(error), "error"));
    }
  };

  if (!active) return null;

  return (
    <Joyride
      run
      continuous
      steps={steps}
      onEvent={handleEvent}
      locale={{
        back: t("tour.back"),
        close: t("common.close"),
        last: t("tour.finish"),
        next: t("tour.next"),
        nextWithProgress: t("tour.nextProgress", { current: "{current}", total: "{total}" }),
        skip: t("tour.skip"),
      }}
      options={{
        buttons: ["back", "skip", "primary"],
        showProgress: true,
        skipBeacon: true,
        skipScroll: true,
        overlayClickAction: false,
        closeButtonAction: "skip",
        dismissKeyAction: false,
        primaryColor: "var(--accent)",
        backgroundColor: "var(--bg-primary)",
        arrowColor: "var(--bg-primary)",
        textColor: "var(--text)",
        overlayColor: "rgba(0, 0, 0, 0.55)",
        width: 360,
        zIndex: 400,
      }}
    />
  );
}
