"use client";

import * as React from "react";
import { UserCircle2 } from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface AvatarProps {
  /** Stored avatar seed. Missing or invalid seeds render the no-avatar state. */
  seed: string | null | undefined;
  /** Name used to derive the fallback initial when no avatar is set. */
  name?: string;
  /** Sizing + text classes from the caller, e.g. "h-16 w-16 text-2xl". */
  className?: string;
}

/**
 * Renders a user's profile picture from its curated DiceBear seed. When there
 * is no valid seed — or the image fails to load — it falls back to the site's
 * normal no-avatar state (an initial-letter circle, or an icon when no name is
 * given) so the UI never shows a broken image or a fake default avatar.
 */
export function Avatar({ seed, name, className }: AvatarProps) {
  const url = getAvatarUrl(seed);
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const failed = failedUrl === url;

  const initial = (name ?? "").trim().charAt(0).toUpperCase();

  if (!url || failed) {
    return (
      <span
        aria-hidden={!initial}
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary",
          !initial && "bg-muted text-muted-foreground",
          className
        )}
      >
        {initial ? (
          initial
        ) : (
          <UserCircle2 className="h-[60%] w-[60%]" />
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name ? `${name}'s profile picture` : ""}
        loading="lazy"
        onError={() => setFailedUrl(url)}
        className="block h-full w-full"
      />
    </span>
  );
}