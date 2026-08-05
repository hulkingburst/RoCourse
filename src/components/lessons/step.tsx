import * as React from "react";

/**
 * Marks one step of a lesson. The stepper renders steps one at a time; the
 * lesson page splitter uses `<Step>` boundaries to break the compiled MDX tree
 * into steps.
 *
 * Authoring rule: keep **one activity per step** (a `FillBlank`, `WriteCode`,
 * `PredictOutput`, `FixBug`, `ArrangeCode`, `Mcq`, `Quiz`…). A step unlocks
 * "Continue" once its activity is solved, so a step with two activities would
 * unlock too early.
 *
 * ```mdx
 * <Step>
 * A variable is a named box.
 *
 * ```luau
 * local coins = 0
 * ```
 * </Step>
 * ```
 */
export function Step({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

(Step as unknown as { isStep: boolean }).isStep = true;
