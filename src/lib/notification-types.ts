/**
 * Shared types for the notifications menu. Kept minimal and serializable so
 * the same shape is used by the client zustand store (localStorage primary)
 * and the server-side DB backup (Notification model).
 */
export type NotificationType =
  | "update" // site news / course update
  | "badge" // a newly earned badge
  | "feedback_received" // confirmation that feedback was submitted
  | "feedback_closed"; // feedback was resolved with the author's real message

export interface AppNotification {
  /** Stable dedup key (e.g. "badge:first-steps", "update:<slug>",
   * "feedback:<issueNumber>:received", "feedback:<issueNumber>:closed").
   * Also the server's Notification.localKey. A ticket's two states use
   * distinct ids so a resolution is a new notification, not an edit. */
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  createdAt: string; // ISO timestamp
  read: boolean;
}

/** Server-side view of a notification row (mirrors AppNotification). */
export interface NotificationState {
  notifications: AppNotification[];
  lastUpdated: string | null;
}
