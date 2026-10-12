"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { prohibitedNameReason } from "@/lib/profanity";

/** Anonymous identity used to post guest XP to the weekly leaderboard. The id
 * is proposed by the device but only counts once the server has issued a signed
 * token for it (see `src/lib/guest-identity.ts`), and both are cached here so a
 * returning guest keeps the same row. Nothing about the device or visitor is
 * stored server-side beyond this id, the self-chosen name, and the claimed XP. */

function newGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface GuestState {
  guestId: string;
  /** Signed token proving the server issued `guestId`, or null when unknown. */
  token: string | null;
  /** Display name shown on the weekly leaderboard ("" = not opted in). */
  name: string;
  setName: (name: string) => void;
  /** Stores the server's answer to an identity request (id plus its token). */
  setIdentity: (guestId: string, token: string | null) => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      guestId: newGuestId(),
      token: null,
      name: "",
      // Single write path for the guest's public name. A name that trips
      // moderation (profanity, an embedded email, or a website) is never
      // persisted locally, so no UI or the XP reporter can ever leak it —
      // regardless of which entry point set it.
      setName: (name) =>
        set((state) => {
          const cleaned = name
            .replace(/[\u0000-\u001F\u007F]/g, "")
            .trim()
            .slice(0, 24);
          if (prohibitedNameReason(cleaned)) return state;
          return { name: cleaned };
        }),
      setIdentity: (guestId, token) => set({ guestId, token }),
    }),
    {
      name: "luau-learn:guest:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        guestId: state.guestId,
        token: state.token,
        name: state.name,
      }),
      // Wipe any legacy persisted name that trips today's moderation rules, so
      // a name saved before the rules existed can't linger in an old device.
      onRehydrateStorage: () => (state) => {
        if (state && state.name && prohibitedNameReason(state.name)) {
          state.setName("");
        }
      },
    }
  )
);
