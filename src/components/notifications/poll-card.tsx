"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Lock, Loader2 } from "lucide-react";
import { getPoll } from "@/lib/polls";
import { usePollVotes } from "@/lib/use-poll-votes";
import { cn } from "@/lib/utils";

/**
 * A feature poll rendered inside the notifications reader.
 *
 * The question, blurb, and option labels come from the i18n catalog
 * (`poll.polls.<id>.*`) so a single authored poll reads correctly in every
 * locale; only the ids and structure live in `src/lib/polls.ts`. Missing
 * translations degrade to a plain untranslated fallback rather than throwing,
 * so a half-translated poll never breaks the bell.
 *
 * Results stay hidden until the learner has voted, then the tally appears.
 * A "what should we build next" poll is only meaningful if the first answers
 * don't set the crowd's mind: an always-visible tally makes later voters
 * follow the early leader instead of their own preference. To reveal the
 * standing to everyone, drop the `showResults` guard below.
 */
export function PollCard({ pollId }: { pollId: string }) {
  const t = useTranslations("poll");
  const { tally, loading, voting, error, vote } = usePollVotes(pollId);
  const poll = React.useMemo(() => getPoll(pollId), [pollId]);

  const questionKey = `polls.${pollId}.question`;
  const bodyKey = `polls.${pollId}.body`;
  const hasQuestion = t.has(questionKey);

  const labelFor = (optionId: string) => {
    const key = `polls.${pollId}.options.${optionId}`;
    return t.has(key) ? t(key) : optionId;
  };

  if (!poll || !hasQuestion) {
    return (
      <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
    );
  }

  const options = poll.options;
  const total = tally?.total ?? 0;
  const yourVote = tally?.yourVote ?? null;
  const closed = tally?.closed ?? false;
  const disabled = closed || voting;
  // The standing is only revealed once this learner has a ballot on record.
  const showResults = yourVote !== null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium leading-relaxed text-foreground">
        {t(questionKey)}
      </p>
      {t.has(bodyKey) ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(bodyKey)}
        </p>
      ) : null}

      <ul className="space-y-2" aria-busy={loading || voting}>
        {options.map((optionId) => {
          const label = labelFor(optionId);
          const count = showResults ? (tally?.counts[optionId] ?? 0) : 0;
          const percent =
            showResults && total > 0 ? Math.round((count / total) * 100) : 0;
          const selected = yourVote === optionId;

          return (
            <li key={optionId}>
              <button
                type="button"
                // A poll changes its mind, not its integrity: picking a second
                // option replaces the first one rather than adding a ballot.
                onClick={() => vote(optionId)}
                disabled={disabled}
                aria-pressed={selected}
                className={cn(
                  "relative block w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  disabled ? "cursor-default" : "hover:bg-accent/60",
                  selected ? "border-primary ring-1 ring-primary" : ""
                )}
              >
                {/* Fill bar communicates the share without stealing the label's
                    contrast — decorative, so it's hidden from assistive tech. */}
                {showResults ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                  />
                ) : null}
                <span className="relative flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1">{label}</span>
                  {selected ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : null}
                  {showResults ? (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {loading ? "—" : `${count} · ${percent}%`}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {voting ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("saving")}
          </span>
        ) : showResults ? (
          <>
            <span>{t("total", { count: total })}</span>
            <span className="text-primary">{t("yourVote", { option: labelFor(yourVote) })}</span>
            {!closed ? <span>{t("changeVote")}</span> : null}
          </>
        ) : (
          <span>{closed ? t("total", { count: total }) : t("pickToSee")}</span>
        )}
        {closed ? (
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {t("closed")}
          </span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
