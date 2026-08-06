"use client";

import { create } from "zustand";

export type AuthMode = "signin" | "signup";

interface AuthUiState {
  open: boolean;
  mode: AuthMode;
  openDialog: (mode?: AuthMode) => void;
  closeDialog: () => void;
}

export const useAuthUiStore = create<AuthUiState>((set) => ({
  open: false,
  mode: "signin",
  openDialog: (mode) => set({ open: true, mode: mode ?? "signin" }),
  closeDialog: () => set({ open: false }),
}));
