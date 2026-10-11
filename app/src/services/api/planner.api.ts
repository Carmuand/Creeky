import { bridge, mutate } from "./bridge";
import type { Countdown, Habit } from "@/types/creeky";
import type { MatrixNoteInput, PomodoroLogResult } from "@/types/pywebview";

/**
 * Habit calls.
 */
export const habitsApi = {
  /**
   * Creates a habit.
   *
   * @param name - Habit name.
   * @returns The created habit.
   */
  create(name: string): Promise<Habit> { return mutate(bridge().create_habit(name)); },

  /**
   * Updates the name, reminder switch or reminder time of a habit.
   *
   * @param id - Habit identifier.
   * @param patch - Fields to change.
   * @returns The updated habit.
   */
  update(id: string, patch: Partial<Pick<Habit, "name" | "notify" | "notifyTime">>): Promise<Habit> { return mutate(bridge().update_habit(id, patch)); },

  /**
   * Checks or unchecks a habit on a date.
   *
   * @param id - Habit identifier.
   * @param day - ISO date to toggle.
   * @returns The updated habit.
   */
  toggleDay(id: string, day: string): Promise<Habit> { return mutate(bridge().toggle_habit_day(id, day)); },

  /**
   * Deletes a habit.
   *
   * @param id - Habit identifier.
   * @returns Promise resolved once the habit is deleted.
   */
  remove(id: string): Promise<null> { return mutate(bridge().delete_habit(id)); },
};

/**
 * Eisenhower matrix note calls.
 */
export const matrixApi = {
  /**
   * Appends notes to their quadrants.
   *
   * @param notes - Notes to add.
   * @param skipExisting - Whether texts already present are ignored.
   * @returns Number of notes added.
   */
  addNotes(notes: MatrixNoteInput[], skipExisting = false): Promise<number> { return mutate(bridge().add_matrix_notes(notes, skipExisting)); },

  /**
   * Deletes the note at a position within a quadrant.
   *
   * @param quadrant - Quadrant that holds the note.
   * @param index - Position of the note.
   * @returns Promise resolved once the note is deleted.
   */
  removeNote(quadrant: string, index: number): Promise<null> { return mutate(bridge().delete_matrix_note(quadrant, index)); },

  /**
   * Moves a note to the end of another quadrant.
   *
   * @param quadrant - Quadrant that holds the note.
   * @param index - Position of the note.
   * @param target - Destination quadrant.
   * @returns Promise resolved once the note is moved.
   */
  moveNote(quadrant: string, index: number, target: string): Promise<null> { return mutate(bridge().move_matrix_note(quadrant, index, target)); },
};

/**
 * Countdown calls.
 */
export const countdownsApi = {
  /**
   * Creates a countdown.
   *
   * @param title - Event title.
   * @param date - Target date as YYYY-MM-DD.
   * @returns The created countdown.
   */
  create(title: string, date: string): Promise<Countdown> { return mutate(bridge().create_countdown(title, date)); },

  /**
   * Updates a countdown.
   *
   * @param id - Countdown identifier.
   * @param title - Event title.
   * @param date - Target date as YYYY-MM-DD.
   * @returns The updated countdown.
   */
  update(id: string, title: string, date: string): Promise<Countdown> { return mutate(bridge().update_countdown(id, title, date)); },

  /**
   * Deletes a countdown.
   *
   * @param id - Countdown identifier.
   * @returns Promise resolved once the countdown is deleted.
   */
  remove(id: string): Promise<null> { return mutate(bridge().delete_countdown(id)); },
};

/**
 * Pomodoro history calls.
 */
export const pomodoroApi = {
  /**
   * Records a finished session and credits the focused task.
   *
   * @param mode - Kind of session.
   * @param minutes - Session length in minutes.
   * @param taskId - Focused task identifier, when any.
   * @param taskTitle - Focused task title, when any.
   * @returns The stored session and the credited task.
   */
  logSession(mode: "focus" | "break", minutes: number, taskId: string | null, taskTitle: string | null): Promise<PomodoroLogResult> { return mutate(bridge().log_pomodoro_session(mode, minutes, taskId, taskTitle)); },

  /**
   * Deletes a session from the history.
   *
   * @param id - Session identifier.
   * @returns Promise resolved once the session is deleted.
   */
  removeSession(id: string): Promise<null> { return mutate(bridge().delete_pomodoro_session(id)); },
};
