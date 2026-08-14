"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Client-generated anonymous identity used to post guest XP to the weekly
 * leaderboard. Nothing about the device or visitor is stored server-side
 * beyond this id, the self-chosen name, and the claimed XP. */

function newGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface GuestState {
  guestId: string;
  /** Display name shown on the weekly leaderboard ("" = not opted in). */
  name: string;
  setName: (name: string) => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      guestId: newGuestId(),
      name: "",
      setName: (name) =>
        set({ name: name.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 24) }),
    }),
    {
      name: "luau-learn:guest:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ guestId: state.guestId, name: state.name }),
    }
  )
);
