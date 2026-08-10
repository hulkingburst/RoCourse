import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateAnswerInput } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
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
