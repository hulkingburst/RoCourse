/**
 * Maps a completion's courseId to the key under the `course` namespace that
 * holds its display name. Stored completions keep their original English
 * title in the database; the UI resolves the localized label from the id.
 */
export function courseTitleKey(courseId: string): string {
  switch (courseId) {
    case "rocourse-coin-tycoon":
      return "finalProjectTycoon";
    case "rocourse-collector":
      return "finalProjectCollector";
    default:
      return "title";
  }
}
