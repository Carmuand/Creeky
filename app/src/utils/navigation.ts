/**
 * Navigate to a Creeky view via hash.
 */
export function navigateTo(view: string): void {
  const hash = `#${view.replace(/^#/, "")}`;
  if (window.location.hash !== hash) window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/**
 * Shorthand for navigating to the calendar view.
 */
export function navigateToCalendar(): void {
  navigateTo("calendar");
}