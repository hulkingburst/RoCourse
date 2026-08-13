import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import {
  dailyChallengeKind,
  dailyDebugChallengeId,
  dailyQuestionId,
} from "@/lib/daily";
import { QUIZ_QUESTIONS } from "@/lib/quiz-data";
import { getDebugAnswer } from "@/lib/daily-debug-answers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generous cap (30/day per IP) keeps probing the endpoint from hammering the
// DB while never affecting a normal learner's single daily pick.
const LIMIT_PER_IP = 30;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;
const limitKey = (ip: string) => `daily-challenge:${ip}`;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** True when `key` is a real calendar date like 2026-08-13. */
function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_RE.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Grades the daily challenge. The answer is recomputed deterministically from
 * the date (never read from the client) and only `{ correct }` is returned, so
 * a learner can't harvest the answer by calling the endpoint beforehand.
 */
export async function POST(request: Request) {
  const ip = trustedIp(request.headers);
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const dateKey = (body as { dateKey?: unknown })?.dateKey;
  const option = (body as { option?: unknown })?.option;
  if (typeof dateKey !== "string" || !isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (
    typeof option !== "number" ||
    !Number.isInteger(option) ||
    option < 0 ||
    option > 3
  ) {
    return NextResponse.json({ error: "Invalid option" }, { status: 400 });
  }

  let answer: number;
  try {
    if (dailyChallengeKind(dateKey) === "quiz") {
      const question = QUIZ_QUESTIONS.find(
        (q) => q.id === dailyQuestionId(dateKey)
      );
      if (!question) {
        return NextResponse.json({ error: "Challenge unavailable" }, { status: 500 });
      }
      answer = question.answer;
    } else {
      answer = getDebugAnswer(dailyDebugChallengeId(dateKey));
    }
  } catch {
    // Unreachable in normal operation; 500 surfaces data drift loudly.
    return NextResponse.json({ error: "Challenge unavailable" }, { status: 500 });
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();

  return NextResponse.json({ correct: option === answer });
}
