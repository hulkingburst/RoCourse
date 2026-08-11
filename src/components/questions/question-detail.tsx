"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Loader2,
  MessageSquarePlus,
  ShieldCheck,
} from "lucide-react";

import { useAuthUiStore } from "@/lib/auth-ui";
import type { QuestionDetail } from "@/lib/questions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthorLink } from "@/components/questions/questions-client";
import { RelativeTime } from "@/components/questions/relative-time";

export function QuestionDetailView({
  initialQuestion,
  lessonTitle,
}: {
  initialQuestion: QuestionDetail;
  lessonTitle?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openDialog } = useAuthUiStore();
  const [question, setQuestion] = React.useState(initialQuestion);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isAuthor = session?.user?.id === question.authorId;

  const toggleSolved = async () => {
    try {
      const response = await fetch(`/api/questions/${question.id}/solved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solved: !question.solved }),
      });
      if (response.ok) {
        setQuestion((current) => ({ ...current, solved: !current.solved }));
      }
    } catch {
      // Best-effort toggle; ignore transient failures.
    }
  };

  const submitAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await response.json()) as {
        answer?: QuestionDetail["answers"][number];
        error?: string;
      };
      if (!response.ok || !data.answer) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      const newAnswer = data.answer;
      setQuestion((current) => ({ ...current, answers: [...current.answers, newAnswer] }));
      setBody("");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerClick = () => {
    if (status !== "authenticated") {
      openDialog("signin");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/questions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All questions
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {question.solved ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3" />
            Solved
          </Badge>
        ) : (
          <Badge variant="outline">
            <CircleDashed className="h-3 w-3" />
            Open
          </Badge>
        )}
        <span className="text-sm text-muted-foreground">
          Asked by <AuthorLink author={question.author} /> ·{" "}
          <RelativeTime date={question.createdAt} />
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">{question.title}</h1>

      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">
        {question.body}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {lessonTitle ? (
          <Link
            href={`/lessons/${question.lessonSlug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            {lessonTitle}
          </Link>
        ) : null}
        {isAuthor ? (
          <Button variant="outline" size="sm" onClick={toggleSolved}>
            {question.solved ? (
              <>
                <CircleDashed className="h-4 w-4" />
                Reopen question
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as solved
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">
          {question.answers.length}{" "}
          {question.answers.length === 1 ? "answer" : "answers"}
        </h2>

        <div className="mt-4 space-y-4">
          {question.answers.length === 0 ? (
            <div className="rounded-xl border border-dashed px-6 py-10 text-center">
              <p className="font-medium">No answers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to help this learner out.
              </p>
            </div>
          ) : (
            question.answers.map((answer) => (
              <div key={answer.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AuthorLink author={answer.author} />
                  <span>·</span>
                  <RelativeTime date={answer.createdAt} />
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {answer.body}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold">Add an answer</h2>
        {status === "authenticated" ? (
          <form onSubmit={submitAnswer} className="mt-4 grid gap-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Explain what you did and why it fixes the problem. Include code snippets and links where helpful."
              maxLength={4000}
              rows={6}
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting || body.trim().length === 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Post answer
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-dashed px-6 py-6 sm:flex-row sm:items-center">
            <div className="flex-1 text-sm text-muted-foreground">
              Sign in to share your knowledge and help other learners.
            </div>
            <Button onClick={handleAnswerClick} className="shrink-0">
              <MessageSquarePlus className="h-4 w-4" />
              Sign in to answer
            </Button>
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Be kind and constructive. No spam or self-promotion.
        </p>
      </div>

      <div className="mt-8 text-right">
        <Button variant="ghost" size="sm" onClick={() => router.push("/questions")}>
          Back to all questions
        </Button>
      </div>
    </div>
  );
}
