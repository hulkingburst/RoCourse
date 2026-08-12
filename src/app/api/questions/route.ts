import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { serializeQuestionListItem, validateQuestionInput } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

// Auth-required but a signed-in user could otherwise spam the write endpoint.
const LIMIT_PER_USER = 10;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const lessonSlug = searchParams.get("lesson");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 100);

  const where =
    status === "open"
      ? { solved: false }
      : status === "solved"
        ? { solved: true }
        : {};

  const questions = await prisma.question.findMany({
    where: lessonSlug ? { ...where, lessonSlug } : where,
    select: {
      id: true,
      title: true,
      body: true,
      lessonSlug: true,
      solved: true,
      createdAt: true,
      author: { select: { name: true, handle: true } },
      _count: { select: { answers: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ questions: questions.map(serializeQuestionListItem) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limitKey = `question:${session.user.id}`;
  if (await isRateLimited(limitKey, LIMIT_PER_USER, LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "You've asked too many questions. Please try again later." },
      { status: 429 }
    );
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Question too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = payload as Record<string, unknown>;
  const validated = validateQuestionInput(parsed?.title, parsed?.body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const lessonSlug =
    typeof parsed.lessonSlug === "string" && parsed.lessonSlug.trim().length > 0
      ? parsed.lessonSlug.trim().slice(0, 100)
      : null;

  const question = await prisma.question.create({
    data: {
      authorId: session.user.id,
      title: validated.title,
      body: validated.body,
      lessonSlug,
    },
    select: {
      id: true,
      title: true,
      body: true,
      lessonSlug: true,
      solved: true,
      createdAt: true,
      author: { select: { name: true, handle: true } },
      _count: { select: { answers: true } },
    },
  });

  await recordRateLimit(limitKey);
  await pruneRateLimits();

  return NextResponse.json({ question: serializeQuestionListItem(question) }, { status: 201 });
}
