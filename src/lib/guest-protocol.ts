/**
 * The part of the guest identity protocol both sides need to agree on.
 *
 * Kept in its own module so browser code can import the wire details without
 * pulling in `src/lib/guest-identity.ts`, which signs tokens with node:crypto
 * and is therefore server-only.
 */

/**
 * Header a GET carries its guest token in. A header rather than a query
 * parameter on purpose: the token is a credential, and a query string ends up
 * in access logs, proxy logs, and referrers, while a request header does not.
 * (POSTs send it in their body, which is equally out of the URL.)
 */
export const GUEST_TOKEN_HEADER = "x-guest-token";
