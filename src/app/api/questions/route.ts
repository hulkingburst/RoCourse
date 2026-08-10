import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeQuestionListItem, validateQuestionInput } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

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

  return NextResponse.json({ question: serializeQuestionListItem(question) }, { status: 201 });
}
