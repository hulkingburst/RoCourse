import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { validateAnswerInput } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

// Auth-required but a signed-in user could otherwise spam the write endpoint.
const LIMIT_PER_USER = 30;
const LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const limitKey = `answer:${session.user.id}`;
  if (await isRateLimited(limitKey, LIMIT_PER_USER, LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: "You've posted too many answers. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Answer too large" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const body = (payload as Record<string, unknown>)?.body;
  const validated = validateAnswerInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const answer = await prisma.questionAnswer.create({
    data: {
      questionId: id,
      authorId: session.user.id,
      body: validated.body,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: { select: { name: true, handle: true } },
    },
  });

  await recordRateLimit(limitKey);
  await pruneRateLimits();

  return NextResponse.json(
    {
      answer: {
        id: answer.id,
        body: answer.body,
        createdAt: answer.createdAt.toISOString(),
        author: { name: answer.author.name, handle: answer.author.handle },
      },
    },
    { status: 201 }
  );
}
