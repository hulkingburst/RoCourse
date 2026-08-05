"use client";

import * as React from "react";
import { markActivity } from "@/components/activities/activity-context";
import { Mcq } from "@/components/activities/mcq";

interface FixBugProps {
  /** The buggy code. Rendered above the options. */
  children: React.ReactNode;
  question?: string;
  options: string[];
  answer: number;
  explanation?: string;
  label?: string;
  alreadySolved?: boolean;
}

/**
 * Find the bug. Shows broken code and asks the learner to pick what's wrong.
 * Uses the multiple-choice engine so wrong picks give targeted feedback and
 * the learner can retry.
 */
export function FixBug({
  children,
  question = "What's the bug?",
  options,
  answer,
  explanation,
  label = "Find the bug",
  alreadySolved = false,
}: FixBugProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg bg-[#0d1117]/60 p-1">{children}</div>
      <Mcq
        question={question}
        options={options}
        answer={answer}
        explanation={explanation}
        label={label}
        alreadySolved={alreadySolved}
      />
    </div>
  );
}

markActivity(FixBug);
