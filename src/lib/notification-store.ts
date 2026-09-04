"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppNotification, NotificationType } from "@/lib/notification-types";

const nowIso = () => new Date().toISOString();

interface NotificationsState {
  /** hydration flag: prevents SSR/client mismatch on first render */
  hydrated: boolean;
  /** Display list, newest first. */
  notifications: AppNotification[];
  /** Set of update ids already surfaced (dedup site updates across sessions). */
  seenUpdateIds: string[];
  /** Set of badge ids whose "earned" notification already fired. */
  earnedBadgeKeys: string[];
  /** Ids that have been pushed to the server backup (idempotency guard). */
  backedUpIds: string[];
  /** Notification ids the user deleted — never re-added by any source. */
  deletedIds: string[];
  /** ISO timestamp of the last local change. */
  lastUpdated: string | null;

  setHydrated: (value: boolean) => void;
  /** Idempotently adds a notification (no-op if `id` already present). */
  addNotification: (
    id: string,
    type: NotificationType,
    title: string,
    opts?: { body?: string | null; link?: string | null }
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Seeds site-update notifications for unseen update entries and records them
   * as seen so they only surface once. */
  seedUpdates: (
    updates: {
      id: string;
      title: string;
      body?: string | null;
      link?: string | null;
      createdAt: string;
    }[]
  ) => void;
  /** Fires a badge notification if it hasn't been fired before. */
  awardBadge: (
    badgeId: string,
    title: string,
    opts?: { body?: string | null; link?: string | null }
  ) => void;
  /** Merges server (DB backup / feedback) notifications in, dedup by id. */
  mergeServer: (server: AppNotification[]) => void;
  /** Marks ids as backed up so we never re-push them. */
  markBackedUp: (ids: string[]) => void;
  /** Removes a notification (and suppresses it being re-added by any source). */
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

function upsert(list: AppNotification[], item: AppNotification): AppNotification[] {
  if (list.some((n) => n.id === item.id)) return list;
  return [item, ...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      hydrated: false,
      notifications: [],
      seenUpdateIds: [],
      earnedBadgeKeys: [],
      backedUpIds: [],
      deletedIds: [],
      lastUpdated: null,

      setHydrated: (value) => set({ hydrated: value }),

      addNotification: (id, type, title, opts) =>
        set((state) => {
          if (state.deletedIds.includes(id)) return state;
          return {
            notifications: upsert(state.notifications, {
              id,
              type,
              title,
              body: opts?.body ?? null,
              link: opts?.link ?? null,
              createdAt: nowIso(),
              read: false,
            }),
            lastUpdated: nowIso(),
          };
        }),

      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id && !n.read ? { ...n, read: true } : n
          ),
          lastUpdated: nowIso(),
        })),

      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.read ? n : { ...n, read: true }
          ),
          lastUpdated: nowIso(),
        })),

      seedUpdates: (updates) =>
        set((state) => {
          const owned: AppNotification[] = [];
          const previousSeen = new Set(state.seenUpdateIds);
          const deleted = new Set(state.deletedIds);
          for (const update of updates) {
            if (previousSeen.has(update.id)) continue;
            const id = `update:${update.id}`;
            if (deleted.has(id)) continue;
            owned.push({
              id: `update:${update.id}`,
              type: "update",
              title: update.title,
              body: update.body ?? null,
              link: update.link ?? null,
              createdAt: update.createdAt,
              read: false,
            });
          }
          const notifications = owned.reduce(upsert, state.notifications);
          const seenUpdateIds = [
            ...state.seenUpdateIds,
            ...updates.map((u) => u.id),
          ];
          return {
            notifications,
            seenUpdateIds,
            lastUpdated: owned.length > 0 ? nowIso() : state.lastUpdated,
          };
        }),

      awardBadge: (badgeId, title, opts) =>
        set((state) => {
          const key = `badge:${badgeId}`;
          if (state.earnedBadgeKeys.includes(badgeId)) return state;
          if (state.deletedIds.includes(key)) {
            // Still record it as awarded so a deleted badge isn't revisited.
            return { earnedBadgeKeys: [...state.earnedBadgeKeys, badgeId] };
          }
          return {
            earnedBadgeKeys: [...state.earnedBadgeKeys, badgeId],
            notifications: upsert(state.notifications, {
              id: key,
              type: "badge",
              title,
              body: opts?.body ?? null,
              link: opts?.link ?? null,
              createdAt: nowIso(),
              read: false,
            }),
            lastUpdated: nowIso(),
          };
        }),

      mergeServer: (server) =>
        set((state) => {
          const deleted = new Set(state.deletedIds);
          const incoming = server.filter((n) => !deleted.has(n.id));
          const notifications = incoming.reduce(upsert, state.notifications);
          if (notifications.length === state.notifications.length) {
            return state;
          }
          // Server-created notifications (e.g. feedback resolutions) are
          // already persisted, so don't round-trip them back on the next push.
          const backedUpIds = Array.from(
            new Set([...state.backedUpIds, ...incoming.map((n) => n.id)])
          );
          return { notifications, backedUpIds, lastUpdated: nowIso() };
        }),

      markBackedUp: (ids) =>
        set((state) => ({
          backedUpIds: Array.from(new Set([...state.backedUpIds, ...ids])),
        })),

      removeNotification: (id) =>
        set((state) => {
          const exists = state.notifications.some((n) => n.id === id);
          if (!exists && state.deletedIds.includes(id)) return state;
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            deletedIds: [...state.deletedIds, id],
            // Pop it from the backup tracker so a later re-push can't resurrect
            // it; the server row is removed by the caller via the API.
            backedUpIds: state.backedUpIds.filter((backedId) => backedId !== id),
            lastUpdated: nowIso(),
          };
        }),

      clearAll: () =>
        set({
          notifications: [],
          seenUpdateIds: [],
          earnedBadgeKeys: [],
          backedUpIds: [],
          deletedIds: [],
          lastUpdated: null,
        }),
    }),
    {
      name: "luau-learn:notifications:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
        seenUpdateIds: state.seenUpdateIds,
        earnedBadgeKeys: state.earnedBadgeKeys,
        backedUpIds: state.backedUpIds,
        deletedIds: state.deletedIds,
        lastUpdated: state.lastUpdated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/** Number of unread notifications. */
export function unreadCount(state: Pick<NotificationsState, "notifications">): number {
  return state.notifications.filter((n) => !n.read).length;
}
