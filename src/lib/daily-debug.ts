export interface DebugChallenge {
  id: string;
  /** Short label shown above the broken script. */
  title: string;
  /** The buggy script. */
  code: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
  /** Lesson that teaches the concept behind the bug. */
  lessonSlug: string;
  lessonLabel: string;
}

/**
 * Pool of "find the bug" challenges for the daily challenge. Each shows a
 * broken script and asks the learner to pick what's wrong. Every learner sees
 * the same challenge on the same day (see `dailyChallengeKind`).
 */
export const DEBUG_CHALLENGES: DebugChallenge[] = [
  {
    id: "debug-nil-part",
    title: "The nil part",
    code: `local part = workspace.SpawnPart
print(part.Position)`,
    question: "What's the bug?",
    options: [
      "The script is missing a local variable",
      "SpawnPart doesn't exist, so part is nil",
      "Position isn't a real property",
      "print needs a string, not a number",
    ],
    answer: 1,
    explanation:
      "workspace.SpawnPart is nil when no part named SpawnPart exists — you can't read .Position off nil. Use WaitForChild(\"SpawnPart\") or check with FindFirstChild first.",
    lessonSlug: "workspace-parts",
    lessonLabel: "Workspace and parts",
  },
  {
    id: "debug-arithmetic-nil",
    title: "Adding to nothing",
    code: `local coins
coins = coins + 10`,
    question: "What's the bug?",
    options: [
      "Can't add to nil — coins has no starting value",
      "The variable name has a typo",
      "+ can't be used on numbers",
      "local must come after the assignment",
    ],
    answer: 0,
    explanation:
      "coins was declared without a value, so it's nil, and nil + 10 is an error. Give it a real start: local coins = 0.",
    lessonSlug: "variables",
    lessonLabel: "Variables",
  },
  {
    id: "debug-call-nil",
    title: "Calling a ghost",
    code: `makeCoins()`,
    question: "What's the bug?",
    options: [
      "makeCoins is a reserved keyword",
      "Functions must be called with a colon",
      "makeCoins isn't defined yet — it's nil",
      "The script is missing a require",
    ],
    answer: 2,
    explanation:
      "You can't call nil. Define the function before calling it — and double-check the spelling. Scripts run top to bottom.",
    lessonSlug: "functions",
    lessonLabel: "Functions",
  },
  {
    id: "debug-undefined-global",
    title: "One letter off",
    code: `local coins = 0
coins = coins + 10
print(coin)`,
    question: "What's the bug?",
    options: [
      "print is spelled wrong",
      "coin doesn't exist — you meant coins",
      "coins can't hold numbers",
      "You need to use += instead",
    ],
    answer: 1,
    explanation:
      "coin (no s) was never declared. Studio warns \"Undefined global\" — variable names must match exactly.",
    lessonSlug: "variable-naming",
    lessonLabel: "Naming variables well",
  },
  {
    id: "debug-missing-end",
    title: "The unclosed block",
    code: `if coins > 10 then
    print("Rich!")`,
    question: "What's the bug?",
    options: [
      "Missing end to close the if block",
      "> is the wrong comparison operator",
      "print can't be called inside an if",
      "The string needs single quotes",
    ],
    answer: 0,
    explanation:
      "Every if needs a matching end. Studio reports \"Expected end\" and points at the line where the block opened.",
    lessonSlug: "conditionals",
    lessonLabel: "Conditionals",
  },
  {
    id: "debug-string-concat",
    title: "The wrong joiner",
    code: `local name = "Ada"
print("Hello " + name)`,
    question: "What's the bug?",
    options: [
      "+ can't join strings — use ..",
      "name must be a number",
      "\"Hello \" needs no quotes",
      "print is not a function",
    ],
    answer: 0,
    explanation:
      "+ is for arithmetic. To join strings in Luau use ..: print(\"Hello \" .. name).",
    lessonSlug: "strings",
    lessonLabel: "Strings",
  },
  {
    id: "debug-zero-index",
    title: "Off by one",
    code: `local items = {"sword", "shield"}
print(items[0])`,
    question: "What's the bug?",
    options: [
      "items[0] is nil — Luau arrays start at 1",
      "Arrays can only hold strings",
      "You need table.insert before reading",
      "print requires two arguments",
    ],
    answer: 0,
    explanation:
      "Luau arrays are 1-indexed. items[1] is \"sword\" and items[0] is nil.",
    lessonSlug: "tables",
    lessonLabel: "Tables",
  },
  {
    id: "debug-localplayer",
    title: "Wrong side of the wire",
    code: `-- in a server Script
local player = game.Players.LocalPlayer`,
    question: "What's the bug?",
    options: [
      "LocalPlayer only exists on the client — it's nil on the server",
      "Players is spelled wrong",
      "Scripts can't access game",
      "You need to require the Players service",
    ],
    answer: 0,
    explanation:
      "The server has no single \"LocalPlayer\" — it sees all players. On the server, use game.Players.PlayerAdded instead.",
    lessonSlug: "remotes",
    lessonLabel: "RemoteEvents",
  },
  {
    id: "debug-character-nil",
    title: "The not-yet-loaded character",
    code: `local player = game.Players.PlayerAdded:Wait()
local humanoid = player.Character.Humanoid`,
    question: "What's the bug?",
    options: [
      "Character doesn't exist yet — it spawns after joining",
      "Humanoid is deprecated",
      "PlayerAdded only fires on the client",
      "The character needs to be cloned manually",
    ],
    answer: 0,
    explanation:
      "A player's Character is nil until it loads. Wait for CharacterAdded, then WaitForChild(\"Humanoid\").",
    lessonSlug: "characters",
    lessonLabel: "Characters and Humanoids",
  },
  {
    id: "debug-infinite-loop",
    title: "The runaway loop",
    code: `local coins = 0
while true do
    coins = coins + 1
end
print(coins)`,
    question: "What's the bug?",
    options: [
      "The loop never ends, so print never runs",
      "coins is accidentally a global",
      "while loops need an end keyword",
      "Only for loops can count",
    ],
    answer: 0,
    explanation:
      "while true do with no exit condition and no task.wait() runs forever — the script never reaches print and Studio may freeze.",
    lessonSlug: "loops",
    lessonLabel: "Loops",
  },
  {
    id: "debug-touch-event",
    title: "The wrong event",
    code: `local door = workspace.Door
door.Touch = function()
    print("opened")
end`,
    question: "What's the bug?",
    options: [
      "Touch isn't a property — the event is called Touched and needs :Connect",
      "Doors can't be touched in code",
      "Assigning functions is not allowed",
      "print is a reserved keyword",
    ],
    answer: 0,
    explanation:
      "Events aren't assigned — they're connected with :Connect, and the touch event is called Touched: door.Touched:Connect(function() ... end).",
    lessonSlug: "events",
    lessonLabel: "Events",
  },
  {
    id: "debug-property-typo",
    title: "The typo in the property",
    code: `local part = workspace.MyPart
print(part.Positon)`,
    question: "What's the bug?",
    options: [
      "Positon isn't a property — it's Position",
      "MyPart needs WaitForChild",
      "print can't show numbers",
      "Part is a reserved word",
    ],
    answer: 0,
    explanation:
      "Studio reports \"Positon is not a valid member\". Tiny typos in property names are a classic first bug — and why autocomplete helps.",
    lessonSlug: "debugging",
    lessonLabel: "Debugging",
  },
];
