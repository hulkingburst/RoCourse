"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Loader2, UserCheck, UserPlus, Users } from "lucide-react";
import { useAuthUiStore } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";

interface ProfileFollowActionsProps {
  handle: string;
  name: string;
  initialFollowers: number;
  initialFollowing: number;
}

interface FollowState {
  isSelf: boolean;
  isFollowing: boolean;
  followers: number;
  following: number;
}

/**
 * Follow button + follower/following counts for a public profile. Live state
 * comes from /api/follow (the server decides identity); guests see public
 * counts and a Follow button that opens the sign-in dialog.
 */
export function ProfileFollowActions({
  handle,
  name,
  initialFollowers,
  initialFollowing,
}: ProfileFollowActionsProps) {
  const t = useTranslations("follow");
  const { status: authStatus } = useSession();
  const openDialog = useAuthUiStore((state) => state.openDialog);

  // Server-authoritative state, fetched once signed-in/loaded.
  const [state, setState] = React.useState<FollowState | null>(null);
  const [pending, setPending] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (authStatus === "loading") return;
    let cancelled = false;
    fetch(`/api/follow?handle=${encodeURIComponent(handle)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: FollowState | null) => {
        if (cancelled || !data) return;
        setState(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authStatus, handle]);

  const isGuest = authStatus === "unauthenticated";
  const isSelf = state?.isSelf ?? false;
  const isFollowing = state?.isFollowing ?? false;
  const followers = state?.followers ?? initialFollowers;
  const following = state?.following ?? initialFollowing;

  const toggle = async () => {
    if (pending || isSelf || isGuest) return;
    setPending(true);
    setFailed(false);
    const action = isFollowing ? "DELETE" : "POST";
    try {
      const response = await fetch("/api/follow", {
        method: action,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await response.json().catch(() => null)) as FollowState | null;
      if (!response.ok || !data) {
        setFailed(true);
        return;
      }
      setState(data);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  const button = () => {
    if (isSelf || isGuest) return null;
    if (isFollowing) {
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggle}
          disabled={pending}
          aria-label={t("followingAria", { name })}
          title={t("followingAria", { name })}
          className="gap-1.5"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          {t("following")}
        </Button>
      );
    }
    return (
      <Button type="button" size="sm" onClick={toggle} disabled={pending} className="gap-1.5">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {t("follow")}
      </Button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        title={t("followersCount", { count: followers })}
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums"
      >
        <Users className="h-3.5 w-3.5" />
        {t("followersCount", { count: followers })}
      </span>
      <span
        title={t("followingCount", { count: following })}
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums"
      >
        <UserCheck className="h-3.5 w-3.5" />
        {t("followingCount", { count: following })}
      </span>
      {isSelf ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <BadgeCheck className="h-3.5 w-3.5" />
          {t("selfHint")}
        </span>
      ) : isGuest ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openDialog("signin")}
          title={t("signInPrompt", { name })}
          className="gap-1.5"
        >
          <UserPlus className="h-4 w-4" />
          {t("follow")}
        </Button>
      ) : (
        button()
      )}
      {failed && (
        <p className="basis-full text-xs text-destructive">{t("error")}</p>
      )}
    </div>
  );
}