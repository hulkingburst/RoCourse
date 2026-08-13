export interface DebugChallenge {
  id: string;
  /** The buggy script. */
  code: string;
  answer: number;
  /** Lesson that teaches the concept behind the bug. */
  lessonSlug: string;
}

/**
 * Pool of "find the bug" challenges for the daily challenge. Each shows a
 * broken script and asks the learner to pick what's wrong. Every learner sees
 * the same challenge on the same day (see `dailyChallengeKind`).
 */
export const DEBUG_CHALLENGES: DebugChallenge[] = [
  {
    id: "debug-nil-part",
    code: `local part = workspace.SpawnPart
print(part.Position)`,
    answer: 1,
    lessonSlug: "workspace-parts",
  },
  {
    id: "debug-arithmetic-nil",
    code: `local coins
coins = coins + 10`,
    answer: 0,
    lessonSlug: "variables",
  },
  {
    id: "debug-call-nil",
    code: `makeCoins()`,
    answer: 2,
    lessonSlug: "functions",
  },
  {
    id: "debug-undefined-global",
    code: `local coins = 0
coins = coins + 10
print(coin)`,
    answer: 1,
    lessonSlug: "variable-naming",
  },
  {
    id: "debug-missing-end",
    code: `if coins > 10 then
    print("Rich!")`,
    answer: 0,
    lessonSlug: "conditionals",
  },
  {
    id: "debug-string-concat",
    code: `local name = "Ada"
print("Hello " + name)`,
    answer: 0,
    lessonSlug: "strings",
  },
  {
    id: "debug-zero-index",
    code: `local items = {"sword", "shield"}
print(items[0])`,
    answer: 0,
    lessonSlug: "tables",
  },
  {
    id: "debug-localplayer",
    code: `-- in a server Script
local player = game.Players.LocalPlayer`,
    answer: 0,
    lessonSlug: "remotes",
  },
  {
    id: "debug-character-nil",
    code: `local player = game.Players.PlayerAdded:Wait()
local humanoid = player.Character.Humanoid`,
    answer: 0,
    lessonSlug: "characters",
  },
  {
    id: "debug-infinite-loop",
    code: `local coins = 0
while true do
    coins = coins + 1
end
print(coins)`,
    answer: 0,
    lessonSlug: "loops",
  },
  {
    id: "debug-touch-event",
    code: `local door = workspace.Door
door.Touch = function()
    print("opened")
end`,
    answer: 0,
    lessonSlug: "events",
  },
  {
    id: "debug-property-typo",
    code: `local part = workspace.MyPart
print(part.Positon)`,
    answer: 0,
    lessonSlug: "debugging",
  },
];
