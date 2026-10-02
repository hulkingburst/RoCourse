/**
 * Retracted notifications: announcements that went out and now have to be
 * unsent, everywhere.
 *
 * A notification is a broadcast, so "remove it" can never mean deleting one
 * row. Every bell that received it holds its own copy — a guest's lives in
 * localStorage, a signed-in learner's in localStorage plus the server backup —
 * and a copy already seeded would come straight back on the next visit. This
 * list is the one place that says "this id was sent, and it should not have
 * been": the client store drops every id here on hydrate and records it as
 * deleted (so no seed, server merge, or badge can re-add it), the notifications
 * API deletes the same keys from the backup for *every* account, and the
 * poll/update registers stop authoring it.
 *
 * Retraction is permanent, not a hide — an id listed here can never be sent
 * again, exactly like a notification a learner deleted by hand. To re-announce
 * the same thing, author it with a fresh id.
 *
 * Unsending is the loud option: it reaches people who already read the entry,
 * and their bell loses something they saw. Reach for it when the notification
 * is wrong, stale, or pointing at something that no longer exists — and check
 * whether the underlying thing (an update, a poll) needs retiring too.
 */
export const RETRACTED_NOTIFICATION_IDS: readonly string[] = [
  // 2026-10-01: the first feature poll asked what to build next, but most of
  // its options — dark mode among them — had already shipped, so the question
  // had stopped meaning anything. The poll itself was withdrawn from
  // `src/lib/polls.ts` in the same change; this unsends the bell entry every
  // learner had already been handed.
  "poll:2026-09-27-next-feature",
];

const RETRACTED = new Set(RETRACTED_NOTIFICATION_IDS);

/** True when a notification id was sent and later withdrawn — never store it. */
export function isRetractedNotification(id: string): boolean {
  return RETRACTED.has(id);
}
