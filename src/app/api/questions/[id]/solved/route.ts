import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Toggle whether a question is marked solved. Only the author may do this. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }
  if (question.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can mark this solved" }, { status: 403 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let solved: unknown;
  try {
    solved = (JSON.parse(raw) as Record<string, unknown>).solved;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (typeof solved !== "boolean") {
    return NextResponse.json({ error: "solved must be a boolean" }, { status: 400 });
  }

  await prisma.question.update({
    where: { id },
    data: { solved },
  });

  return NextResponse.json({ ok: true, solved });
}
