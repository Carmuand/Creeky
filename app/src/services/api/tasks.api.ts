import { bridge, mutate } from "./bridge";
import type { Task, TaskList } from "@/types/creeky";
import type { TaskListPatch, TaskPatch } from "@/types/pywebview";

/**
 * Task calls.
 */
export const tasksApi = {
  /**
   * Creates a task at the top of its list.
   *
   * @param payload - Task fields; `title` is required.
   * @returns The created task.
   */
  create(payload: TaskPatch): Promise<Task> { return mutate(bridge().create_task(payload)); },

  /**
   * Updates fields of a task.
   *
   * @param id - Task identifier.
   * @param patch - Fields to change.
   * @returns The updated task.
   */
  update(id: string, patch: TaskPatch): Promise<Task> { return mutate(bridge().update_task(id, patch)); },

  /**
   * Permanently deletes a task.
   *
   * @param id - Task identifier.
   * @returns Promise resolved once the task is deleted.
   */
  remove(id: string): Promise<null> { return mutate(bridge().delete_task(id)); },

  /**
   * Permanently deletes every trashed task.
   *
   * @returns Number of tasks removed.
   */
  emptyTrash(): Promise<number> { return mutate(bridge().empty_trash()); },
};

/**
 * Task list calls.
 */
export const listsApi = {
  /**
   * Creates a task list.
   *
   * @param payload - List fields; `name` is required.
   * @returns The created list.
   */
  create(payload: TaskListPatch): Promise<TaskList> { return mutate(bridge().create_list(payload)); },

  /**
   * Updates fields of a task list.
   *
   * @param id - List identifier.
   * @param patch - Fields to change.
   * @returns The updated list.
   */
  update(id: string, patch: TaskListPatch): Promise<TaskList> { return mutate(bridge().update_list(id, patch)); },

  /**
   * Deletes a list, sending its active tasks to the trash.
   *
   * @param id - List identifier.
   * @returns Number of tasks moved to the trash.
   */
  remove(id: string): Promise<number> { return mutate(bridge().delete_list(id)); },
};

/**
 * Tag calls.
 */
export const tagsApi = {
  /**
   * Creates a tag.
   *
   * @param name - Tag name.
   * @returns The normalized tag name.
   */
  create(name: string): Promise<string> { return mutate(bridge().create_tag(name)); },

  /**
   * Renames a tag, merging it into an existing tag with the new name.
   *
   * @param name - Current tag name.
   * @param newName - New tag name.
   * @returns The final name and whether a merge happened.
   */
  rename(name: string, newName: string): Promise<{ name: string; merged: boolean }> { return mutate(bridge().rename_tag(name, newName)); },

  /**
   * Deletes a tag and detaches it from every task.
   *
   * @param name - Tag name.
   * @returns Promise resolved once the tag is deleted.
   */
  remove(name: string): Promise<null> { return mutate(bridge().delete_tag(name)); },

  /**
   * Deletes the tags no task uses.
   *
   * @returns Number of tags removed.
   */
  removeUnused(): Promise<number> { return mutate(bridge().delete_unused_tags()); },
};
