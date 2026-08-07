"use client";

import * as React from "react";

/**
 * Stepper activity bridge.
 *
 * Every activity component calls `onResult(correct)` when the learner submits
 * a graded attempt. The stepper records the attempt in the progress store and
 * unlocks "Continue" once the current step's activities are all solved.
 */
export interface StepperContextValue {
  /** Index of the currently visible step. */
  activeIndex: number;
  /** True when the currently visible step has been solved. */
  solved: boolean;
  /** Report a graded attempt from the currently visible step. */
  onResult: (correct: boolean, firstTry?: boolean) => void;
}

export const StepperContext = React.createContext<StepperContextValue>({
  activeIndex: 0,
  solved: false,
  onResult: () => {},
});

export function useStepper(): StepperContextValue {
  return React.useContext(StepperContext);
}

/**
 * Marks a component as an interactive activity so the step splitter can flag
 * steps that must be solved before the learner may continue.
 */
export const ACTIVITY_MARKER = Symbol.for("luau-learn.activity");

export function markActivity<T>(component: T): T {
  (component as unknown as Record<PropertyKey, unknown>)[ACTIVITY_MARKER] = true;
  return component;
}

export function isActivityType(
  type: unknown
): type is React.ComponentType {
  return (
    typeof type === "function" ||
    (typeof type === "object" &&
      type !== null &&
      "type" in (type as object))
  ) &&
    ((type as Record<PropertyKey, unknown>)[ACTIVITY_MARKER] === true);
}
