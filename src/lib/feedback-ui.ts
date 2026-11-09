"use client";

import { create } from "zustand";

export const FEEDBACK_TYPES = ["bug", "feature", "improvement", "other"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

interface FeedbackUiState {
  open: boolean;
  type: FeedbackType;
  openDialog: (type?: FeedbackType) => void;
  closeDialog: () => void;
}

export const useFeedbackUiStore = create<FeedbackUiState>((set) => ({
  open: false,
  type: "bug",
  // There is one dialog for the whole app (rendered by AppShell), so every
  // trigger — the footer link, the floating pill, the ideas banner — goes
  // through here and can choose which type starts selected.
  openDialog: (type) => set({ open: true, type: type ?? "bug" }),
  closeDialog: () => set({ open: false }),
}));
