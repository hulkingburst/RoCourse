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
    id: "2026-09-07-follows-friends-board",
    title: "Follow learners & a friends-only leaderboard",
    body: "You can now follow any learner from their public profile, and the leaderboard has a \"Friends\" tab that shows just you and the accounts you follow. Your follower and following counts appear on your profile. Badge celebrations also get a fun pop-up the moment you earn one.",
    link: "/leaderboard",
    createdAt: "2026-09-07T18:00:00.000Z",
  },
  {
    id: "2026-09-06-certificates-share-resources",
    title: "Section certificates, shareable achievements & owner picks",
    body: "You now earn a certificate for every complete section — not just the whole course — and you can share any certificate or your public profile with a single copy-link. The Resources page also has an \"Owner picks\" filter for resources the course author personally recommends. Your certificates live in the profile and on the Certificate page.",
    createdAt: "2026-09-06T17:00:00.000Z",
  },
  {
    id: "2026-09-05-typed-feedback",
    title: "Typed feedback & reply alerts",
    body: "Feedback now has a type picker — bug, feature request, improvement, or other — so reports land in the right place. And signed-in learners get a notification the moment the author replies. Check the bell in the header.",
    createdAt: "2026-09-05T00:00:00.000Z",
  },
  {
    id: "2026-09-03-notifications",
    title: "Notifications are here",
    body: "You now have a notifications menu for new site updates, badges you earn, and replies to your feedback. Check the bell icon in the header.",
    createdAt: "2026-09-03T00:00:00.000Z",
  },
];
