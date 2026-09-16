import { useState } from "react";

export interface EisenhowerViewState {
  list: string;
  filterText: string;
}

/**
 * Manages Eisenhower matrix view state.
 */
export function useEisenhower() {
  const [view, setView] = useState<EisenhowerViewState>({ list: "all", filterText: "" });

  const setList = (list: string) => setView((p) => ({ ...p, list }));
  const setFilterText = (filterText: string) => setView((p) => ({ ...p, filterText }));
  const reset = () => setView({ list: "all", filterText: "" });

  return { view, setView, setList, setFilterText, reset };
}