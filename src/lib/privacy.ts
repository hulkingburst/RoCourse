/**
 * Masks an email address so only the first character of the local part is
 * visible (e.g. "renowhn@gmail.com" -> "r********@gmail.com"). Used anywhere
 * an email is shown by default, with an explicit opt-in to reveal the full
 * value.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const shown = local.length <= 1 ? local : local.slice(0, 1);
  const stars = Math.max(1, Math.min(4, local.length - 1));
  return `${shown}${"*".repeat(stars)}@${domain}`;
}
