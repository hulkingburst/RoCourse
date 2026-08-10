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
 * A lesson's medal reflects how many of its graded activity steps were solved
 * on the first attempt: all of them is gold, most is silver, any is bronze.
 */
export function lessonMedal(correctFirstTry: number, totalActivities: number): MedalResult {
  if (totalActivities <= 0 || correctFirstTry <= 0) {
    return { medal: null, correct: correctFirstTry, total: totalActivities };
  }
  if (correctFirstTry >= totalActivities) {
    return { medal: "gold", correct: correctFirstTry, total: totalActivities };
  }
  if (correctFirstTry >= Math.ceil(totalActivities * 0.6)) {
    return { medal: "silver", correct: correctFirstTry, total: totalActivities };
  }
  return { medal: "bronze", correct: correctFirstTry, total: totalActivities };
}
