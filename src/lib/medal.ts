export type LessonMedal = "gold" | "silver" | "bronze";

export interface MedalResult {
  medal: LessonMedal | null;
  correct: number;
  total: number;
}

const MEDAL_LABEL: Record<LessonMedal, string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

export function medalLabel(medal: LessonMedal): string {
  return MEDAL_LABEL[medal];
}

/**
 * A lesson's medal reflects how many of its quick-check questions were solved
 * on the first pick: all of them is gold, most is silver, any is bronze.
 */
export function lessonMedal(correctFirstTry: number, totalQuestions: number): MedalResult {
  if (totalQuestions <= 0 || correctFirstTry <= 0) {
    return { medal: null, correct: correctFirstTry, total: totalQuestions };
  }
  if (correctFirstTry >= totalQuestions) {
    return { medal: "gold", correct: correctFirstTry, total: totalQuestions };
  }
  if (correctFirstTry >= Math.ceil(totalQuestions * 0.6)) {
    return { medal: "silver", correct: correctFirstTry, total: totalQuestions };
  }
  return { medal: "bronze", correct: correctFirstTry, total: totalQuestions };
}
