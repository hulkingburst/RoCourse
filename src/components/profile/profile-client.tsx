"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import * as React from "react";
import {
  Award,
  Bookmark,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  ListChecks,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserCircle2,
  Zap,
} from "lucide-react";

import { useAuthUiStore } from "@/lib/auth-ui";
import { extractBadgeStats } from "@/lib/badges";
import { maskEmail } from "@/lib/privacy";
import { useProgressStore } from "@/lib/progress-store";
import { courseTitleKey } from "@/lib/course-titles";
import { courseRef, sectionRef } from "@/lib/certificate-refs";
import type { CompletedSection } from "@/lib/section-completion";
import { isStreakActive } from "@/lib/streak";
import { levelProgress, weekKey } from "@/lib/xp";
import { cn } from "@/lib/utils";
import type { CloudState } from "@/lib/sync-types";
import { setAvatar, setStatus, setTitle } from "@/lib/account-actions";
import { cleanStatus, STATUS_MAX_LENGTH } from "@/lib/status";
import { AVATAR_OPTIONS } from "@/lib/avatar";
import { TITLES, getTitleById } from "@/lib/titles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityCalendar } from "@/components/profile/activity-calendar";
import { Avatar } from "@/components/profile/avatar";
import { BadgesSection } from "@/components/profile/badges";
import { ShareLinkButton } from "@/components/share/share-link-button";

interface ProfileClientProps {
  totalLessons: number;
  lessonMap: { slug: string; title: string }[];
  handle: string | null;
  sectionCertificates: CompletedSection[];
  /** Title ids the user has genuinely earned (computed server-side). */
  unlockedTitles: string[];
}

export function ProfileClient({
  totalLessons,
  lessonMap,
  handle,
  sectionCertificates,
  unlockedTitles,
}: ProfileClientProps) {
  const t = useTranslations("profile");
  const titleNs = useTranslations("title");
  const course = useTranslations("course");
  const home = useTranslations("home");
  const auth = useTranslations("auth");
  const { data: session, status, update } = useSession();
  const [revealEmail, setRevealEmail] = React.useState(false);
  const { openDialog } = useAuthUiStore();
  const lessons = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const lastLesson = useProgressStore((state) => state.lastLesson);
  const finishedPath = useProgressStore((state) => state.finishedPath);
  const quickQuizzesCompleted = useProgressStore(
    (state) => state.quickQuizzesCompleted
  );
  const streak = useProgressStore((state) => state.streak);
  const longestStreak = useProgressStore((state) => state.longestStreak);
  const lastStreakDate = useProgressStore((state) => state.lastStreakDate);
  const dailyChallengesCompleted = useProgressStore(
    (state) => state.dailyChallengesCompleted
  );
  const drillsPlayed = useProgressStore((state) => state.drillsPlayed);
  const drillHighScore = useProgressStore((state) => state.drillHighScore);
  const activityDays = useProgressStore((state) => state.activityDays);
  const xp = useProgressStore((state) => state.xp);
  const weeklyXp = useProgressStore((state) => state.weeklyXp);
  const [cloud, setCloud] = React.useState<CloudState | null>(null);
  const [loadingSync, setLoadingSync] = React.useState(true);
  const [avatar, setAvatarPreview] = React.useState<string | null | undefined>(
    session?.user?.avatar
  );
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [titleOverride, setTitleOverride] = React.useState<
    string | null | undefined
  >(undefined);
  const [titleSaving, setTitleSaving] = React.useState(false);
  const [statusOverride, setStatusOverride] = React.useState<
    string | null | undefined
  >(undefined);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusEditing, setStatusEditing] = React.useState(false);
  const [statusDraft, setStatusDraft] = React.useState("");
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [statusSaved, setStatusSaved] = React.useState(false);
  const router = useRouter();

  const pickAvatar = async (id: string | null) => {
    if (avatarSaving) return;
    setAvatarSaving(true);
    const result = await setAvatar(id);
    setAvatarSaving(false);
    if (result.error) return;
    setAvatarPreview(result.avatar ?? null);
    await update();
    router.refresh();
  };

  const pickTitle = async (id: string | null) => {
    if (titleSaving) return;
    setTitleSaving(true);
    const result = await setTitle(id);
    setTitleSaving(false);
    if (result.error) return;
    setTitleOverride(result.title ?? null);
    await update();
    router.refresh();
  };

  React.useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        if (response.ok && !cancelled) {
          setCloud((await response.json()) as CloudState);
        }
      } catch {
        // Keep local stats; cloud fetch is best-effort.
      } finally {
        if (!cancelled) setLoadingSync(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "authenticated" || !session.user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <UserCircle2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">{t("signInTitle")}</h1>
        <p className="mt-3 text-muted-foreground">{t("signInBody")}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => openDialog("signin")}>{auth("signIn")}</Button>
          <Button variant="outline" onClick={() => openDialog("signup")}>
            {auth("createAccount")}
          </Button>
        </div>
      </div>
    );
  }

  const completedCount = Object.values(lessons).filter(
    (record) => record.completedAt != null
  ).length;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const quizAttempted = Object.values(lessons).reduce(
    (sum, record) => sum + record.quizAttempted,
    0
  );
  const quizCorrect = Object.values(lessons).reduce(
    (sum, record) => sum + record.quizCorrect,
    0
  );
  const quizAccuracy =
    quizAttempted > 0 ? Math.round((quizCorrect / quizAttempted) * 100) : null;

  const challengesSolved = Object.values(lessons).reduce(
    (sum, record) => sum + record.challengesSolved,
    0
  );

  const lastLessonTitle = lessonMap.find((lesson) => lesson.slug === lastLesson)?.title;
  const currentPathLabel =
    finishedPath === "tycoon"
      ? t("finalProjectTycoon")
      : finishedPath === "collector"
        ? t("finalProjectCollector")
        : null;

  const completions = cloud?.completions ?? [];
  const streakActive = isStreakActive(lastStreakDate);

  const badgeStats = extractBadgeStats(
    {
      lessons,
      bookmarks,
      streak,
      longestStreak,
      dailyChallengesCompleted,
      quickQuizzesCompleted,
      finishedPath,
    },
    totalLessons
  );
  // Weekly-first placement is global leaderboard data served from the cloud
  // sync, not the local progress store — merge it in from the fetch above.
  badgeStats.weeklyFirsts = cloud?.weeklyFirsts ?? 0;
  // Same for resolved feedback tickets: the count lives in the GitHub-facing
  // ticket table, served via the cloud sync.
  badgeStats.feedbackResolved = cloud?.feedbackResolved ?? 0;

  const currentTitle =
    titleOverride !== undefined ? titleOverride : session.user.title ?? null;
  const currentTitleDef = getTitleById(currentTitle);

  const currentStatus =
    statusOverride !== undefined ? statusOverride : session.user.status ?? null;

  const saveStatus = async (raw: string | null) => {
    if (statusSaving) return;
    setStatusError(null);
    const cleaned = cleanStatus(raw ?? "");
    if (cleaned.length > STATUS_MAX_LENGTH) {
      setStatusError(t("statusTooLong"));
      return;
    }
    setStatusSaving(true);
    const result = await setStatus(cleaned);
    setStatusSaving(false);
    if (result.error) {
      setStatusError(
        result.error === "badWord"
          ? t("statusBadWord")
          : result.error === "email"
            ? t("statusEmail")
            : result.error === "site"
              ? t("statusSite")
              : result.error === "tooLong"
                ? t("statusTooLong")
                : t("statusError")
      );
      return;
    }
    setStatusOverride(result.status ?? null);
    setStatusEditing(false);
    setStatusSaved(true);
    await update();
    router.refresh();
  };

  const beginStatusEdit = () => {
    setStatusDraft(currentStatus ?? "");
    setStatusError(null);
    setStatusSaved(false);
    setStatusEditing(true);
  };

  const titlePickerItems = () => (
    <>
      <DropdownMenuLabel className="text-center text-xs font-medium text-muted-foreground">
        {t("titlePick")}
      </DropdownMenuLabel>
      {TITLES.map((option) => {
        const unlocked = unlockedTitles.includes(option.id);
        return (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => {
              if (unlocked) void pickTitle(option.id);
            }}
            disabled={!unlocked || titleSaving}
            className="gap-2 py-2"
          >
            <option.icon
              className={cn(
                "h-4 w-4 shrink-0",
                unlocked ? "text-primary" : "text-muted-foreground/70"
              )}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium leading-tight">
                {titleNs(`${option.id}.name`)}
              </span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                {titleNs(`${option.id}.description`)}
              </span>
            </span>
            {!unlocked && (
              <Lock className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        );
      })}
      {currentTitleDef ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void pickTitle(null)}
            disabled={titleSaving}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t("titleRemove")}
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative shrink-0">
          <Avatar
            seed={avatar ?? session.user.avatar}
            name={session.user.name || t("learner")}
            className="h-16 w-16 text-2xl"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("avatarPick")}
                disabled={avatarSaving}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-1 ring-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {avatarSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="p-2">
              <DropdownMenuLabel className="text-center text-xs font-medium text-muted-foreground">
                {t("avatarPick")}
              </DropdownMenuLabel>
              <div className="grid max-h-64 grid-cols-5 gap-1.5 overflow-y-auto">
                {AVATAR_OPTIONS.map((option, index) => (
                  <DropdownMenuItem
                    key={option.id}
                    asChild
                    onSelect={() => void pickAvatar(option.id)}
                  >
                    <button
                      type="button"
                      disabled={avatarSaving}
                      aria-label={t("avatarOption", { n: index + 1 })}
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <Avatar seed={option.id} className="h-10 w-10" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </div>
              {avatar || session.user.avatar ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => void pickAvatar(null)}
                    disabled={avatarSaving}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("avatarRemove")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {session.user.name || t("learner")}
            </h1>
            {currentTitleDef ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("titlePick")}
                    disabled={titleSaving}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium transition hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {titleSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <currentTitleDef.icon className="h-3.5 w-3.5 text-primary" />
                    )}
                    {titleNs(`${currentTitleDef.id}.name`)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  className="w-64 p-2"
                >
                  {titlePickerItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("titlePick")}
                    disabled={titleSaving}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {titleSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Pencil className="h-3 w-3" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  className="w-64 p-2"
                >
                  {titlePickerItems()}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {!statusEditing ? (
            currentStatus ? (
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 flex-1 break-words text-sm text-muted-foreground">
                  {currentStatus}
                </p>
                <button
                  type="button"
                  onClick={beginStatusEdit}
                  aria-label={t("statusEdit")}
                  className="inline-flex shrink-0 items-center rounded p-1 text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={beginStatusEdit}
                className="mt-1 inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Pencil className="h-3 w-3" />
                {t("statusEmpty")}
              </button>
            )
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("status");
                void saveStatus(typeof value === "string" ? value : "");
              }}
              className="mt-2 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  name="status"
                  autoFocus
                  maxLength={STATUS_MAX_LENGTH}
                  value={statusDraft}
                  onChange={(event) => {
                    setStatusDraft(event.target.value);
                    setStatusError(null);
                  }}
                  placeholder={t("statusPlaceholder")}
                  aria-label={t("statusEmpty")}
                  className={cn(
                    "min-w-0 flex-1",
                    statusError ? "border-destructive focus-visible:ring-destructive" : ""
                  )}
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" disabled={statusSaving}>
                    {statusSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {t("statusSave")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={statusSaving}
                    onClick={() => {
                      setStatusEditing(false);
                      setStatusError(null);
                    }}
                  >
                    {t("statusCancel")}
                  </Button>
                  {currentStatus ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={statusSaving}
                      onClick={() => void saveStatus(null)}
                      className="text-destructive hover:text-destructive"
                    >
                      {t("statusClear")}
                    </Button>
                  ) : null}
                </div>
              </div>
              {statusError ? (
                <p className="text-xs text-destructive">{statusError}</p>
              ) : null}
            </form>
          )}
          {statusSaved && !statusEditing ? (
            <p className="mt-1 text-xs text-success">{t("statusSaved")}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-mono">
              {revealEmail ? session.user.email : maskEmail(session.user.email ?? "")}
            </span>
            <button
              type="button"
              onClick={() => setRevealEmail((value) => !value)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              {revealEmail ? (
                <>
                  <EyeOff className="h-3 w-3" /> {t("hide")}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" /> {t("reveal")}
                </>
              )}
            </button>
          </span>
          {handle ? (
            <>
              <Link
                href={`/u/${handle}`}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                @{handle}
              </Link>
              <ShareLinkButton
                path={`/u/${handle}`}
                labelKey="shareProfile"
                variant="ghost"
                size="sm"
                className="h-auto gap-1.5 px-1 text-xs underline-offset-4 hover:underline"
              />
            </>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {cloud?.account?.createdAt
            ? t("joined", {
                date: new Date(cloud.account.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                }),
              })
            : t("joinedRecently")}
        </p>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame
              className={cn(
                "h-5 w-5",
                streakActive ? "text-orange-500" : "text-muted-foreground"
              )}
            />
            {t("dayStreak")}
          </CardTitle>
          <CardDescription>
            {streakActive ? t("streakActiveHint") : t("streakStartHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-3">
            <Flame
              className={cn(
                "h-9 w-9",
                streakActive ? "fill-orange-500 text-orange-500" : "text-muted-foreground"
              )}
            />
            <div>
              <div className="text-3xl font-bold leading-none">{streak}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("daysInARow", { count: streak })}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("bestLabel")}{" "}
            <span className="font-semibold text-foreground">
              {t("bestValue", { count: longestStreak })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {t("levelTitle")}
          </CardTitle>
          <CardDescription>{t("levelHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-2xl font-bold text-amber-500 ring-1 ring-amber-500/30">
                {levelProgress(xp).level}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {t("levelLabel", { level: levelProgress(xp).level })}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t("xpTotal", { xp })}
                </div>
              </div>
            </div>
            <div className="min-w-56 flex-1">
              <Progress value={levelProgress(xp).progress * 100} />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t("xpToNext", {
                  level: levelProgress(xp).level,
                  xpInto: levelProgress(xp).xpIntoLevel,
                  xpForNext: levelProgress(xp).xpForNextLevel,
                })}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("weeklyXp", { xp: weeklyXp[weekKey(new Date())] ?? 0 })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("activity")}
          </CardTitle>
          <CardDescription>{t("activityHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityCalendar activityDays={activityDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {t("courseProgress")}
          </CardTitle>
          <CardDescription>
            {t("completedOf", { completed: completedCount, total: totalLessons })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label={t("statLessons")} value={String(completedCount)} />
            <Stat icon={<Bookmark className="h-4 w-4" />} label={t("statBookmarks")} value={String(bookmarks.length)} />
            <Stat
              icon={<Flame className="h-4 w-4" />}
              label={t("statChallenges")}
              value={String(challengesSolved)}
            />
            <Stat
              icon={<Award className="h-4 w-4" />}
              label={t("statQuizAccuracy")}
              value={quizAccuracy == null ? "—" : `${quizAccuracy}%`}
            />
            <Stat
              icon={<ListChecks className="h-4 w-4" />}
              label={t("statMiniQuizzes")}
              value={String(quickQuizzesCompleted)}
            />
            <Stat
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("statDailyChallenges")}
              value={String(dailyChallengesCompleted)}
            />
            <Stat
              icon={<Trophy className="h-4 w-4" />}
              label={t("statDrillsBest")}
              value={String(drillHighScore)}
            />
            <Stat
              icon={<Timer className="h-4 w-4" />}
              label={t("statDrillsPlayed")}
              value={String(drillsPlayed)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <BadgesSection stats={badgeStats} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {course("continueLearning")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lastLessonTitle ? (
              <Link
                href={`/lessons/${lastLesson}`}
                className="text-primary underline underline-offset-4"
              >
                {lastLessonTitle}
              </Link>
            ) : (
              <Link
                href="/lessons"
                className="text-primary underline underline-offset-4"
              >
                {home("startCourse")}
              </Link>
            )}
            {currentPathLabel ? (
              <p className="text-muted-foreground">
                {t("finalProject", { path: currentPathLabel })}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("coursesCompleted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
{completions.length > 0 ? (
              completions.map((completion) => (
                <div
                  key={completion.courseId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-medium">
                    {course(courseTitleKey(completion.courseId))}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/certificate?course=${completion.courseId}`}
                      className="text-xs font-medium text-primary underline underline-offset-4"
                    >
                      {t("certificate")}
                    </Link>
                    {handle ? (
                      <ShareLinkButton
                        path={`/certificate/${handle}/${courseRef(completion.courseId)}`}
                        labelKey="shareCertificate"
                        size="iconSm"
                        variant="ghost"
                        className="h-auto w-auto p-1 text-muted-foreground"
                      />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {new Date(completion.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                {loadingSync ? t("syncing") : t("noCoursesYet")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {sectionCertificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              {t("sectionCertificates")}
            </CardTitle>
            <CardDescription>{t("sectionCertificatesHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sectionCertificates.map((item) => (
              <div
                key={item.sectionId}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {item.title}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/certificate?section=${item.sectionId}`}
                    className="text-xs font-medium text-primary underline underline-offset-4"
                  >
                    {t("certificate")}
                  </Link>
                  {handle ? (
                    <ShareLinkButton
                      path={`/certificate/${handle}/${sectionRef(item.sectionId)}`}
                      labelKey="shareCertificate"
                      size="iconSm"
                      variant="ghost"
                      className="h-auto w-auto p-1 text-muted-foreground"
                    />
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.completedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
