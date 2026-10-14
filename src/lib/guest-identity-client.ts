"use client";

import { useGuestStore } from "@/lib/guest-store";
import { GUEST_TOKEN_HEADER } from "@/lib/guest-protocol";

/**
 * Asks the server for an identity token, caching whatever it answers with.
 *
 * The id already held is offered along with the token that came with it. A
 * device the server recognises — its token, even an aged-out one, proves the id
 * was issued to it — keeps that identity and its board row. An id nobody has
 * claimed is adopted as-is, which is what a first-time guest and a device with
 * cleared storage get. When the server answers with a *different* id (an id
 * that belongs to someone else, so it will not be re-signed for a stranger) the
 * caller adopts that one instead.
 *
 * Returns the token to use, or null when the request never landed.
 */
export async function requestGuestIdentity(
  guestId: string,
  token: string | null
): Promise<string | null> {
  try {
    const response = await fetch(
      `/api/guest-xp?guestId=${encodeURIComponent(guestId)}`,
      {
        cache: "no-store",
        headers: token ? { [GUEST_TOKEN_HEADER]: token } : undefined,
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      guestId?: unknown;
      token?: unknown;
    };
    if (typeof payload.token !== "string") return null;
    const identity =
      typeof payload.guestId === "string" && payload.guestId.length > 0
        ? payload.guestId
        : guestId;
    useGuestStore.getState().setIdentity(identity, payload.token);
    return payload.token;
  } catch {
    return null;
  }
}
