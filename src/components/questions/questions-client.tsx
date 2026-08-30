"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  MessageCircleQuestion,
  MessageSquarePlus,
  SearchX,
  HelpCircle,
} from "lucide-react";

import { useAuthUiStore } from "@/lib/auth-ui";
import type { QuestionAuthor, QuestionListItem } from "@/lib/questions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RelativeTime } from "@/components/questions/relative-time";

type Filter = "all" | "open" | "solved";

export function QuestionsClient({
  initialQuestions,
  lessons,
}: {
  initialQuestions: QuestionListItem[];
  lessons: { slug: string; title: string }[];
}) {
  const t = useTranslations("questions");
  const router = useRouter();
  const { status } = useSession();
  const { openDialog } = useAuthUiStore();
  const [filter, setFilter] = React.useState<Filter>("all");
  const [questions, setQuestions] = React.useState(initialQuestions);
  const [askOpen, setAskOpen] = React.useState(false);

  const lessonTitles = new Map(lessons.map((lesson) => [lesson.slug, lesson.title]));

  const counts = React.useMemo(
    () => ({
      all: questions.length,
      open: questions.filter((q) => !q.solved).length,
      solved: questions.filter((q) => q.solved).length,
    }),
    [questions]
  );

  const visible =
    filter === "open"
      ? questions.filter((q) => !q.solved)
      : filter === "solved"
        ? questions.filter((q) => q.solved)
        : questions;

  const handleAsk = () => {
    if (status !== "authenticated") {
      openDialog("signin");
      return;
    }
    setAskOpen(true);
  };

  const handleAsked = (question: QuestionListItem) => {
    setQuestions((current) => [question, ...current]);
    setAskOpen(false);
    router.push(`/questions/${question.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageCircleQuestion className="h-8 w-8 text-primary" />
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button onClick={handleAsk}>
          <MessageSquarePlus className="h-4 w-4" />
          {t("askButton")}
        </Button>
      </div>

      <div className="mt-8 flex gap-1 rounded-lg border bg-muted/40 p-1">
        {(
          [
            ["all", t("filterAll")],
            ["open", t("filterOpen")],
            ["solved", t("filterSolved")],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filter === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            <span className="ml-1.5 text-xs text-muted-foreground">{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed px-6 py-16 text-center">
            <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">{t("noQuestions")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all" ? t("noQuestionsAll") : t("noQuestionsFiltered")}
            </p>
          </div>
        ) : (
          visible.map((question) => (
            <QuestionRow
              key={question.id}
              question={question}
              lessonTitle={question.lessonSlug ? lessonTitles.get(question.lessonSlug) : undefined}
            />
          ))
        )}
      </div>

      {askOpen && (
        <AskQuestionDialog
          lessons={lessons}
          open={askOpen}
          onOpenChange={setAskOpen}
          onCreated={handleAsked}
        />
      )}
    </div>
  );
}

function QuestionRow({
  question,
  lessonTitle,
}: {
  question: QuestionListItem;
  lessonTitle?: string;
}) {
  const t = useTranslations("questions");
  return (
    <Link
      href={`/questions/${question.id}`}
      className="block rounded-xl border bg-card p-4 transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug">{question.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{question.body}</p>
        </div>
        {question.solved ? (
          <Badge variant="success" className="shrink-0">
            {t("solved")}
          </Badge>
        ) : (
          <Badge variant="outline" className="shrink-0">
            {t("open")}
          </Badge>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <AuthorLink author={question.author} />
        <span>
          <RelativeTime date={question.createdAt} />
        </span>
        <span className="inline-flex items-center gap-1">
          <HelpCircle className="h-3.5 w-3.5" />
          {t("answerCount", { count: question.answerCount })}
        </span>
        {lessonTitle ? <span className="text-muted-foreground/80">{lessonTitle}</span> : null}
      </div>
    </Link>
  );
}

export function AuthorLink({ author }: { author: QuestionAuthor }) {
  return author.handle ? (
    <Link
      href={`/u/${author.handle}`}
      className="font-medium text-foreground hover:underline"
    >
      {author.name}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{author.name}</span>
  );
}

function AskQuestionDialog({
  lessons,
  open,
  onOpenChange,
  onCreated,
}: {
  lessons: { slug: string; title: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (question: QuestionListItem) => void;
}) {
  const t = useTranslations("questions");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [lessonSlug, setLessonSlug] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setLessonSlug("");
    setError(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, lessonSlug: lessonSlug || undefined }),
      });
      const data = (await response.json()) as {
        question?: QuestionListItem;
        error?: string;
      };
      if (!response.ok || !data.question) {
        setError(data.error ?? t("errorGeneric"));
        return;
      }
      reset();
      onCreated(data.question);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("askTitle")}</DialogTitle>
          <DialogDescription>
            {t("askDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="question-title">{t("titleLabel")}</Label>
            <Input
              id="question-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={120}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="question-lesson">{t("lessonLabel")}</Label>
            <select
              id="question-lesson"
              value={lessonSlug}
              onChange={(event) => setLessonSlug(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" className="bg-white text-black">
                {t("noLesson")}
              </option>
              {lessons.map((lesson) => (
                <option key={lesson.slug} value={lesson.slug} className="bg-white text-black">
                  {lesson.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="question-body">{t("bodyLabel")}</Label>
            <textarea
              id="question-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("bodyPlaceholder")}
              maxLength={4000}
              rows={6}
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("postQuestion")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
