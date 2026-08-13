import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Flame,
  ListChecks,
  Search,
  ShieldCheck,
  Timer,
  Trophy,
} from "lucide-react";
import { ActivityCalendar } from "@/components/profile/activity-calendar";
import { BadgesSection } from "@/components/profile/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PublicProfile } from "@/lib/users";
import { courseTitleKey } from "@/lib/course-titles";

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

export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const t = useTranslations("profile");
  const course = useTranslations("course");
  const { stats } = profile;
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";
  const joined = new Date(profile.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
  const hasActivity = Object.keys(stats.activityDays).length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("joinedAt", { handle: profile.handle, date: joined })}
          </p>
        </div>
        <div className="ml-auto">
          <Link
            href="/users"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            <Search className="h-3.5 w-3.5" />
            {t("findLearners")}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Stat
          icon={<BookOpen className="h-4 w-4" />}
          label={t("statLessons")}
          value={`${stats.lessonsCompleted}/${profile.totalLessons}`}
        />
        <Stat
          icon={<Flame className="h-4 w-4" />}
          label={t("dayStreak")}
          value={String(stats.streak)}
        />
        <Stat
          icon={<Flame className="h-4 w-4" />}
          label={t("bestStreak")}
          value={String(stats.longestStreak)}
        />
        <Stat
          icon={<ListChecks className="h-4 w-4" />}
          label={t("statMiniQuizzes")}
          value={String(stats.quickQuizzesCompleted)}
        />
        <Stat
          icon={<CalendarDays className="h-4 w-4" />}
          label={t("statDailyChallenges")}
          value={String(stats.dailyChallengesCompleted)}
        />
        <Stat
          icon={<Trophy className="h-4 w-4" />}
          label={t("statDrillsBest")}
          value={String(stats.drillHighScore)}
        />
        <Stat
          icon={<Timer className="h-4 w-4" />}
          label={t("statDrillsPlayed")}
          value={String(stats.drillsPlayed)}
        />
        <Stat
          icon={<Trophy className="h-4 w-4" />}
          label={t("courses")}
          value={String(profile.completions.length)}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <BadgesSection stats={profile.badgeStats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {t("recentActivity")}
          </CardTitle>
          <CardDescription>{t("recentActivityHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasActivity ? (
            <ActivityCalendar activityDays={stats.activityDays} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("noPublicActivity")}</p>
          )}
        </CardContent>
      </Card>

      {profile.completions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {t("coursesCompleted")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profile.completions.map((completion) => (
              <div
                key={completion.courseId}
                className="flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {course(courseTitleKey(completion.courseId))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(completion.completedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t("privacyNote")}
      </p>
    </div>
  );
}
