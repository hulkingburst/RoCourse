import { prisma } from "@/lib/prisma";
import { moderateName } from "@/lib/profanity";

export const QUESTION_TITLE_MIN = 5;
export const QUESTION_TITLE_MAX = 120;
export const QUESTION_BODY_MIN = 10;
export const QUESTION_BODY_MAX = 4000;
export const ANSWER_BODY_MIN = 5;
export const ANSWER_BODY_MAX = 4000;

export interface QuestionAuthor {
  name: string;
  handle: string | null;
}

export interface QuestionListItem {
  id: string;
  title: string;
  body: string;
  lessonSlug: string | null;
  solved: boolean;
  createdAt: string;
  answerCount: number;
  author: QuestionAuthor;
}

export interface QuestionAnswerItem {
  id: string;
  body: string;
  createdAt: string;
  author: QuestionAuthor;
}

export interface QuestionDetail extends QuestionListItem {
  authorId: string;
  answers: QuestionAnswerItem[];
}

function authorOf(user: { name: string; handle: string | null }): QuestionAuthor {
  return { name: moderateName(user.name), handle: user.handle };
}

export function serializeQuestionListItem(
  question: {
    id: string;
    title: string;
    body: string;
    lessonSlug: string | null;
    solved: boolean;
    createdAt: Date;
    author: { name: string; handle: string | null };
    _count?: { answers: number };
    answers?: unknown[];
  }
): QuestionListItem {
  return {
    id: question.id,
    title: question.title,
    body: question.body,
    lessonSlug: question.lessonSlug,
    solved: question.solved,
    createdAt: question.createdAt.toISOString(),
    answerCount:
      question._count?.answers ?? (Array.isArray(question.answers) ? question.answers.length : 0),
    author: authorOf(question.author),
  };
}

export function serializeQuestionDetail(
  question: {
    id: string;
    title: string;
    body: string;
    lessonSlug: string | null;
    solved: boolean;
    createdAt: Date;
    authorId: string;
    author: { name: string; handle: string | null };
    answers: {
      id: string;
      body: string;
      createdAt: Date;
      author: { name: string; handle: string | null };
    }[];
  }
): QuestionDetail {
  return {
    ...serializeQuestionListItem(question),
    authorId: question.authorId,
    answers: question.answers.map((answer) => ({
      id: answer.id,
      body: answer.body,
      createdAt: answer.createdAt.toISOString(),
      author: authorOf(answer.author),
    })),
  };
}

export function validateQuestionInput(
  title: unknown,
  body: unknown
): { ok: true; title: string; body: string } | { ok: false; error: string } {
  if (typeof title !== "string" || typeof body !== "string") {
    return { ok: false, error: "Title and body are required." };
  }
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (cleanTitle.length < QUESTION_TITLE_MIN || cleanTitle.length > QUESTION_TITLE_MAX) {
    return {
      ok: false,
      error: `Title must be between ${QUESTION_TITLE_MIN} and ${QUESTION_TITLE_MAX} characters.`,
    };
  }
  if (cleanBody.length < QUESTION_BODY_MIN || cleanBody.length > QUESTION_BODY_MAX) {
    return {
      ok: false,
      error: `Question must be between ${QUESTION_BODY_MIN} and ${QUESTION_BODY_MAX} characters.`,
    };
  }
  return { ok: true, title: cleanTitle, body: cleanBody };
}

export function validateAnswerInput(
  body: unknown
): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof body !== "string") {
    return { ok: false, error: "Answer body is required." };
  }
  const cleanBody = body.trim();
  if (cleanBody.length < ANSWER_BODY_MIN || cleanBody.length > ANSWER_BODY_MAX) {
    return {
      ok: false,
      error: `Answer must be between ${ANSWER_BODY_MIN} and ${ANSWER_BODY_MAX} characters.`,
    };
  }
  return { ok: true, body: cleanBody };
}

export async function getQuestionDetail(id: string): Promise<QuestionDetail | null> {
  const question = await prisma.question.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      body: true,
      lessonSlug: true,
      solved: true,
      createdAt: true,
      authorId: true,
      author: { select: { name: true, handle: true } },
      answers: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { name: true, handle: true } },
        },
      },
    },
  });
  return question ? serializeQuestionDetail(question) : null;
}

export async function listQuestions(options?: {
  lessonSlug?: string | null;
  solved?: boolean | null;
  limit?: number;
}): Promise<QuestionListItem[]> {
  const where: {
    lessonSlug?: string;
    solved?: boolean;
  } = {};
  if (options?.lessonSlug) where.lessonSlug = options.lessonSlug;
  if (options?.solved != null) where.solved = options.solved;

  const questions = await prisma.question.findMany({
    where,
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
    take: Math.min(Math.max(options?.limit ?? 100, 1), 200),
  });

  return questions.map(serializeQuestionListItem);
}
