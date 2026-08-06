"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import * as React from "react";
import {
  Award,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Flame,
  Loader2,
  Target,
  Trophy,
  UserCircle2,
} from "lucide-react";

import { useAuthUiStore } from "@/lib/auth-ui";
import { useProgressStore } from "@/lib/progress-store";
import type { CloudState } from "@/lib/sync-types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProfileClientProps {
  totalLessons: number;
  lessonMap: { slug: string; title: string }[];
}

export function ProfileClient({ totalLessons, lessonMap }: ProfileClientProps) {
  const { data: session, status } = useSession();
  const { openDialog } = useAuthUiStore();
  const lessons = useProgressStore((state) => state.lessons);
  const bookmarks = useProgressStore((state) => state.bookmarks);
  const lastLesson = useProgressStore((state) => state.lastLesson);
  const finishedPath = useProgressStore((state) => state.finishedPath);
  const [cloud, setCloud] = React.useState<CloudState | null>(null);
  const [loadingSync, setLoadingSync] = React.useState(true);

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
        <h1 className="text-2xl font-bold">Your progress, anywhere</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to sync your progress across devices and see your completed
          courses. You can keep learning without an account — this is entirely
          optional.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={() => openDialog("signin")}>Sign in</Button>
          <Button variant="outline" onClick={() => openDialog("signup")}>
            Create account
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
      ? "Coin Tycoon"
      : finishedPath === "collector"
        ? "The Collector"
        : null;

  const completions = cloud?.completions ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {session.user.name || "Learner"}
        </h1>
        <p className="mt-1 text-muted-foreground">{session.user.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Joined{" "}
          {cloud?.account?.createdAt
            ? new Date(cloud.account.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
              })
            : "recently"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Course progress
          </CardTitle>
          <CardDescription>
            {completedCount} of {totalLessons} lessons completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pct} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Lessons" value={String(completedCount)} />
            <Stat icon={<Bookmark className="h-4 w-4" />} label="Bookmarks" value={String(bookmarks.length)} />
            <Stat
              icon={<Flame className="h-4 w-4" />}
              label="Challenges solved"
              value={String(challengesSolved)}
            />
            <Stat
              icon={<Award className="h-4 w-4" />}
              label="Quiz accuracy"
              value={quizAccuracy == null ? "—" : `${quizAccuracy}%`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Continue learning
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
                Start the course
              </Link>
            )}
            {currentPathLabel ? (
              <p className="text-muted-foreground">
                Final project: {currentPathLabel}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Courses completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {completions.length > 0 ? (
              completions.map((completion) => (
                <div
                  key={completion.courseId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-medium">{completion.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(completion.completedAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                {loadingSync
                  ? "Syncing…"
                  : "No courses finished yet — the capstone awaits."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
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
