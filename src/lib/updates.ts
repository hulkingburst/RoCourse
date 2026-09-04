/**
 * Managed site-update announcements. These are authored here (in code) and
 * broadcast to every signed-in learner — and to guests via the local store —
 * as "update" notifications. Add a new entry at the TOP with a fresh `id`
 * (use the date) and a `createdAt` timestamp; learners who haven't seen it yet
 * will get a one-time notification.
 */
export interface SiteUpdate {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt: string; // ISO date — controls ordering and dedup.
}

export const SITE_UPDATES: SiteUpdate[] = [
  {
    id: "2026-09-03-notifications",
    title: "Notifications are here",
    body: "You now have a notifications menu for new site updates, badges you earn, and replies to your feedback. Check the bell icon in the header.",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
];
