import { prisma } from "@/lib/prisma";
import { countLessons } from "@/lib/lessons";
import { extractBadgeStats, type BadgeStats } from "@/lib/badges";
import { MAX_LIFETIME_XP } from "@/lib/xp";

/** Public stats that are safe to show about any user, derived from the JSON
 * progress blob. Never includes email or any identifying detail. */
export interface PublicStats {
  hasProgress: boolean;
  lessonsCompleted: number;
  streak: number;
  longestStreak: number;
  dailyChallengesCompleted: number;
  quickQuizzesCompleted: number;
  drillsPlayed: number;
  drillHighScore: number;
  finishedPath: "tycoon" | "collector" | null;
  activityDays: Record<string, number>;
  /** Lifetime total XP, source of the learner's level. */
  xp: number;
}

export interface PublicCompletion {
  courseId: string;
  title: string;
  completedAt: string;
}

/** Full public view of one user, served from a public route. */
export interface PublicProfile {
  handle: string;
  name: string;
  createdAt: string;
  totalLessons: number;
  stats: PublicStats;
  badgeStats: BadgeStats;
  completions: PublicCompletion[];
}

/** Entry for the learner showcase — someone who finished a course. */
export interface ShowcaseEntry {
  handle: string;
  name: string;
  completedAt: string;
  courseTitle: string;
  project: "tycoon" | "collector" | null;
}

function clampInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function extractActivityDays(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof count === "number") {
      out[key] = count;
    }
  }
  return out;
}

/** Reads the opaque ProgressProfile.data JSON and extracts public-safe stats. */
export function extractPublicStats(data: unknown): PublicStats {
  if (typeof data !== "object" || data === null) {
    return {
      hasProgress: false,
      lessonsCompleted: 0,
      streak: 0,
      longestStreak: 0,
      dailyChallengesCompleted: 0,
      quickQuizzesCompleted: 0,
      drillsPlayed: 0,
      drillHighScore: 0,
      finishedPath: null,
      activityDays: {},
      xp: 0,
    };
  }
  const record = data as Record<string, unknown>;

  const lessons =
    typeof record.lessons === "object" && record.lessons !== null
      ? (record.lessons as Record<string, unknown>)
      : {};
  let lessonsCompleted = 0;
  for (const lesson of Object.values(lessons)) {
    if (typeof lesson === "object" && lesson !== null) {
      const lessonRecord = lesson as Record<string, unknown>;
      if (typeof lessonRecord.completedAt === "string" && lessonRecord.completedAt) {
        lessonsCompleted += 1;
      }
    }
  }

  const finishedPath =
    record.finishedPath === "tycoon" || record.finishedPath === "collector"
      ? record.finishedPath
      : null;

  return {
    hasProgress: lessonsCompleted > 0 || record.lastUpdated != null,
    lessonsCompleted,
    streak: clampInt(record.streak),
    longestStreak: clampInt(record.longestStreak),
    dailyChallengesCompleted: clampInt(record.dailyChallengesCompleted),
    quickQuizzesCompleted: clampInt(record.quickQuizzesCompleted),
    drillsPlayed: clampInt(record.drillsPlayed),
    drillHighScore: clampInt(record.drillHighScore),
    finishedPath,
    activityDays: extractActivityDays(record.activityDays),
    xp: Math.min(MAX_LIFETIME_XP, clampInt(record.xp)),
  };
}

/** Converts a display name into a URL-safe handle base. */
export function slugifyHandle(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "learner";
}

/** Returns a unique handle derived from a name, appending a short suffix on
 * collisions. */
export async function generateUniqueHandle(name: string): Promise<string> {
  const base = slugifyHandle(name);
  const available = async (handle: string) =>
    (await prisma.user.findUnique({ where: { handle } })) === null;

  if (await available(base)) return base;

  for (let attempt = 1; attempt < 100; attempt++) {
    const suffix = `${attempt.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const handle = `${base}-${suffix}`;
    if (await available(handle)) return handle;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Back-fills a handle for users created before handles existed. Idempotent. */
export async function ensureHandle(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, handle: true },
  });
  if (!user) return null;
  if (user.handle) return user.handle;

  const handle = await generateUniqueHandle(user.name);
  await prisma.user.update({ where: { id: userId }, data: { handle } });
  return handle;
}

/** Public profile for the /u/[handle] route. Returns null when unknown. */
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      handle: true,
      name: true,
      createdAt: true,
      progress: { select: { data: true } },
      completions: {
        orderBy: { completedAt: "asc" },
        select: { courseId: true, title: true, completedAt: true },
      },
    },
  });
  if (!user) return null;

  const totalLessons = countLessons();

  return {
    handle: user.handle ?? handle,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    totalLessons,
    stats: extractPublicStats(user.progress?.data),
    badgeStats: extractBadgeStats(user.progress?.data, totalLessons),
    completions: user.completions.map((completion) => ({
      courseId: completion.courseId,
      title: completion.title,
      completedAt: completion.completedAt.toISOString(),
    })),
  };
}

/** Wall-of-fame rows: learners who completed a course, newest first. Only
 * users with a public handle are listed, since each row links to a profile. */
export async function getLearnerShowcase(): Promise<ShowcaseEntry[]> {
  const completions = await prisma.courseCompletion.findMany({
    where: { user: { handle: { not: null } } },
    select: {
      completedAt: true,
      title: true,
      user: {
        select: { handle: true, name: true, progress: { select: { data: true } } },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  return completions.map((completion) => ({
    handle: completion.user.handle as string,
    name: completion.user.name,
    completedAt: completion.completedAt.toISOString(),
    courseTitle: completion.title,
    project: extractPublicStats(completion.user.progress?.data).finishedPath,
  }));
}
