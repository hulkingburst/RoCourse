export interface DebugChallenge {
  id: string;
  /** The buggy script. */
  code: string;
  /** Lesson that teaches the concept behind the bug. */
  lessonSlug: string;
}

/**
 * Pool of "find the bug" challenges for the daily challenge. Each shows a
 * broken script and asks the learner to pick what's wrong. Every learner sees
 * the same challenge on the same day (see `dailyChallengeKind`).
 *
 * This module is safe for the client bundle: the correct answers live in
 * `src/lib/daily-debug-answers.ts` (server-only) and are applied by the
 * POST /api/daily-challenge grading endpoint, so the answer is never shipped
 * to the browser. If you add a challenge here, add its answer there too.
 */
export const DEBUG_CHALLENGES: DebugChallenge[] = [
  {
    id: "debug-nil-part",
    code: `local part = workspace.SpawnPart
print(part.Position)`,
    lessonSlug: "workspace-parts",
  },
  {
    id: "debug-arithmetic-nil",
    code: `local coins
coins = coins + 10`,
    lessonSlug: "variables",
  },
  {
    id: "debug-call-nil",
    code: `makeCoins()`,
    lessonSlug: "functions",
  },
  {
    id: "debug-undefined-global",
    code: `local coins = 0
coins = coins + 10
print(coin)`,
    lessonSlug: "variable-naming",
  },
  {
    id: "debug-missing-end",
    code: `if coins > 10 then
    print("Rich!")`,
    lessonSlug: "conditionals",
  },
  {
    id: "debug-string-concat",
    code: `local name = "Ada"
print("Hello " + name)`,
    lessonSlug: "strings",
  },
  {
    id: "debug-zero-index",
    code: `local items = {"sword", "shield"}
print(items[0])`,
    lessonSlug: "tables",
  },
  {
    id: "debug-localplayer",
    code: `-- in a server Script
local player = game.Players.LocalPlayer`,
    lessonSlug: "remotes",
  },
  {
    id: "debug-character-nil",
    code: `local player = game.Players.PlayerAdded:Wait()
local humanoid = player.Character.Humanoid`,
    lessonSlug: "characters",
  },
  {
    id: "debug-infinite-loop",
    code: `local coins = 0
while true do
    coins = coins + 1
end
print(coins)`,
    lessonSlug: "loops",
  },
  {
    id: "debug-touch-event",
    code: `local door = workspace.Door
door.Touch = function()
    print("opened")
end`,
    lessonSlug: "events",
  },
  {
    id: "debug-property-typo",
    code: `local part = workspace.MyPart
print(part.Positon)`,
    lessonSlug: "debugging",
  },
];
