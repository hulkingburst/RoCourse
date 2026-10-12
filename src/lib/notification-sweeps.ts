import {
  syncFeedbackResolutions,
  unsendNotifications,
} from "@/lib/notifications-api";
import { RETRACTED_NOTIFICATION_IDS } from "@/lib/notification-retractions";

/**
 * The background work behind the notification bell.
 *
 * Two side effects used to run inside `GET /api/notifications`, which the bell
 * polls: retraction deletes (a shared-token write across every account) and the
 * signed-in user's feedback resolution sync (GitHub API calls). Running those
 * per poll meant a client polling once a minute multiplied both by sixty, for
 * changes that at most happen a few times a day.
 *
 * The Cloudflare build emits no cron handler and the polling GET must stay a
 * read, so the sweeps are throttled here and scheduled from the read instead of
 * being awaited by it: at most once per window, and never on the response path.
 * Each is idempotent, so an instance that misses its turn (or two instances
 * sweeping at once) cannot corrupt anything — the next due request picks the
 * work up.
 */

/** How often each sweep may run. */
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

/** Cap on the per-user throttle map so a long-lived instance stays bounded. */
const MAX_TRACKED_USERS = 500;

let retractionRunAt = 0;
let retractionRunning = false;
const feedbackRunAt = new Map<string, number>();

/**
 * Schedules due housekeeping for the given user. Safe to call on every poll:
 * it returns immediately when nothing is due, and never rejects.
 */
export function scheduleNotificationSweeps(userId: string, now: number = Date.now()): void {
  // Retractions are keyed across accounts, so one run serves every learner —
  // a single global throttle, not one per user.
  if (
    !retractionRunning &&
    RETRACTED_NOTIFICATION_IDS.length > 0 &&
    now - retractionRunAt >= SWEEP_INTERVAL_MS
  ) {
    retractionRunAt = now;
    retractionRunning = true;
    void unsendNotifications(RETRACTED_NOTIFICATION_IDS)
      .catch(() => null)
      .finally(() => {
        retractionRunning = false;
      });
  }

  // The feedback sync is per user: an account needs its own pass, so it gets
  // its own throttle entry.
  const lastForUser = feedbackRunAt.get(userId) ?? 0;
  if (now - lastForUser < SWEEP_INTERVAL_MS) return;
  if (feedbackRunAt.size >= MAX_TRACKED_USERS) feedbackRunAt.clear();
  feedbackRunAt.set(userId, now);
  void syncFeedbackResolutions(userId).catch(() => null);
}
