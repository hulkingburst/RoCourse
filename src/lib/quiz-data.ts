export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: number;
  explanation?: string;
}

/** How many questions a single quick quiz draws (randomly) from the bank. */
export const QUIZ_SIZE = 10;

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "What does the print function do in Luau?",
    options: [
      "Creates a new part",
      "Opens a dialog",
      "Outputs text to the Output window",
      "Runs a script",
    ],
    answer: 2,
    explanation:
      "print() writes text to Studio's Output window — your first debugging tool.",
  },
  {
    id: "q2",
    question: "How do you write a single-line comment in Luau?",
    options: ["-- text", "// text", "# text", "/* text */"],
    answer: 0,
    explanation:
      "Luau uses -- for comments. // is C-style and is not valid Luau.",
  },
  {
    id: "q3",
    question: "Which keyword creates a new local variable?",
    options: ["var", "let", "local", "const"],
    answer: 2,
  },
  {
    id: "q4",
    question: "What does the # operator return when applied to a string?",
    options: [
      "Its first character",
      "The number 0",
      "An error",
      "Its length in bytes",
    ],
    answer: 3,
    explanation: '#"hello" returns 5 — the length of the string in bytes.',
  },
  {
    id: "q5",
    question: "What is the value of \"10\" + 5 in Luau?",
    options: ["\"105\"", "An error", "10.5", "15"],
    answer: 3,
    explanation:
      "Luau automatically coerces numeric strings in arithmetic, so \"10\" + 5 is 15.",
  },
  {
    id: "q6",
    question: "What does the % operator do?",
    options: [
      "Divides two numbers",
      "Returns the remainder of a division",
      "Concatenates strings",
      "Multiplies numbers",
    ],
    answer: 1,
    explanation: "The modulo operator gives the remainder, e.g. 7 % 3 is 1.",
  },
  {
    id: "q7",
    question: "Which operator joins two strings together?",
    options: ["..", "+", "&", ".join()"],
    answer: 0,
    explanation:
      '.. is the concatenation operator: "foo" .. "bar" gives "foobar".',
  },
  {
    id: "q8",
    question: "What is the result of 5 ^ 2?",
    options: ["10", "25", "7", "52"],
    answer: 1,
    explanation: "^ is exponentiation, so 5 squared is 25.",
  },
  {
    id: "q9",
    question: "After local x = 10 and then x = x + 5, what is x?",
    options: ["15", "5", "10", "105"],
    answer: 0,
  },
  {
    id: "q10",
    question: "What does type(true) return?",
    options: ["true", "\"string\"", "nil", "\"boolean\""],
    answer: 3,
    explanation: "type() returns a string describing the value's type.",
  },
  {
    id: "q11",
    question: "Which values are 'truthy' in Luau?",
    options: [
      "Only true",
      "Only numbers",
      "Everything except false and nil",
      "Only non-zero values",
    ],
    answer: 2,
    explanation:
      "Only false and nil are falsy — even 0 and empty strings are truthy.",
  },
  {
    id: "q12",
    question: "What does nil represent in Luau?",
    options: [
      "The number 0",
      "An empty string",
      "The absence of a value",
      "A broken script",
    ],
    answer: 2,
  },
  {
    id: "q13",
    question: "What is the difference between = and ==?",
    options: [
      "== assigns, = compares",
      "They are the same",
      "Neither is valid",
      "= assigns, == compares",
    ],
    answer: 3,
  },
  {
    id: "q14",
    question: "What is the result of true and false?",
    options: ["false", "true", "nil", "An error"],
    answer: 0,
  },
  {
    id: "q15",
    question: "What is the result of not false?",
    options: ["false", "nil", "An error", "true"],
    answer: 3,
  },
  {
    id: "q16",
    question: "Which values make if x then run its block?",
    options: [
      "Only true",
      "Any truthy value",
      "Only numbers",
      "Only non-zero values",
    ],
    answer: 1,
  },
  {
    id: "q17",
    question: "When does if health <= 0 then run?",
    options: [
      "When health is zero or negative",
      "Only when health is exactly 0",
      "When health is positive",
      "When health is missing",
    ],
    answer: 0,
  },
  {
    id: "q18",
    question: "What is the purpose of elseif?",
    options: [
      "Check another condition when the previous was false",
      "Repeat a block of code",
      "Exit a function early",
      "Assign a variable",
    ],
    answer: 0,
  },
  {
    id: "q19",
    question: "How does every if statement end in Luau?",
    options: ["fi", "}", "end", "endif"],
    answer: 2,
  },
  {
    id: "q20",
    question:
      "What does local x = false and error(\"boom\") evaluate to?",
    options: ["An error", "true", "nil", "false, without raising the error"],
    answer: 3,
    explanation:
      "and short-circuits: when the left side is falsy, the right side is never evaluated.",
  },
  {
    id: "q21",
    question: "How many times does the body of for i = 1, 5 do run?",
    options: ["6", "4", "Infinite", "5"],
    answer: 3,
  },
  {
    id: "q22",
    question: "What values does for i = 1, 5, 2 do produce?",
    options: ["1, 2, 3, 4, 5", "1, 3, 5", "1, 3", "5, 3, 1"],
    answer: 1,
    explanation: "A step of 2 skips every other value, ending at 5.",
  },
  {
    id: "q23",
    question: "A while true do loop with no exit condition will…",
    options: [
      "Run forever (crash the script)",
      "Run once",
      "Never run",
      "Automatically stop after 60s",
    ],
    answer: 0,
  },
  {
    id: "q24",
    question: "In repeat ... until condition, when is the condition checked?",
    options: [
      "Before the body runs",
      "After the body runs (at least once)",
      "Only on the first pass",
      "Never",
    ],
    answer: 1,
  },
  {
    id: "q25",
    question: "What does break do inside a loop?",
    options: [
      "Skips one iteration",
      "Restarts the loop",
      "Exits the current loop immediately",
      "Returns a value",
    ],
    answer: 2,
  },
  {
    id: "q26",
    question: "What skips the rest of the current iteration in a Luau loop?",
    options: ["skip", "next", "continue", "repeat"],
    answer: 2,
    explanation: "Luau supports continue to jump to the next iteration.",
  },
  {
    id: "q27",
    question: "How do you define a function named heal?",
    options: [
      "local function heal() end",
      "function = heal() end",
      "def heal():",
      "heal := function()",
    ],
    answer: 0,
  },
  {
    id: "q28",
    question: "What keyword sends a value back out of a function?",
    options: ["output", "send", "yield", "return"],
    answer: 3,
  },
  {
    id: "q29",
    question: "A function that never hits return returns…",
    options: ["nil", "0", "false", "An error"],
    answer: 0,
  },
  {
    id: "q30",
    question: "In local function add(a, b) what are a and b?",
    options: ["Globals", "Returns", "Parameters", "Comments"],
    answer: 2,
  },
  {
    id: "q31",
    question:
      "What does ... mean in a function like local function log(...)?",
    options: [
      "It accepts any number of extra arguments",
      "It means 'and so on' (a comment)",
      "It declares a type",
      "It is invalid Luau",
    ],
    answer: 0,
    explanation: "The variadic ... lets a function accept extra arguments.",
  },
  {
    id: "q32",
    question:
      "Calling part:SetPosition() instead of part.SetPosition(part) — what does the : do?",
    options: [
      "Makes the call run faster",
      "Passes part as the first argument (self)",
      "Creates a new part",
      "Ignores arguments",
    ],
    answer: 1,
    explanation:
      "The colon passes the instance itself as the first argument, known as self.",
  },
  {
    id: "q33",
    question: "In Luau, what is the index of the first element of an array?",
    options: ["0", "-1", "1", "It depends on the table"],
    answer: 2,
    explanation: "Luau arrays are 1-indexed: {10, 20, 30}[1] is 10.",
  },
  {
    id: "q34",
    question: "What is #{10, 20, 30}?",
    options: ["10", "3", "30", "60"],
    answer: 1,
    explanation: "# returns the length of an array-like table.",
  },
  {
    id: "q35",
    question: "If t = {name = \"Ada\"}, how else can you write t.name?",
    options: ["t.name()", "t::name", "t\\name", "t[\"name\"]"],
    answer: 3,
  },
  {
    id: "q36",
    question: "What does table.insert(t, x) do?",
    options: [
      "Replaces the first element",
      "Appends x to the end of t",
      "Deletes t",
      "Sorts t",
    ],
    answer: 1,
  },
  {
    id: "q37",
    question: "What is the result of (\"hello\"):sub(1, 2)?",
    options: ["\"el\"", "\"h\"", "\"he\"", "\"hello\""],
    answer: 2,
  },
  {
    id: "q38",
    question: "What does string.upper(\"hi\") return?",
    options: ["\"hi\"", "\"HI\"", "\"Hi\"", "\"hI\""],
    answer: 1,
  },
  {
    id: "q39",
    question: "What does table.concat({\"a\", \"b\"}, \"-\") return?",
    options: ["\"ab\"", "\"a-b\"", "\"a, b\"", "\"a\" \"b\""],
    answer: 1,
  },
  {
    id: "q40",
    question: "What is the result of 5 // 2 in Luau?",
    options: ["2.5", "3", "An error", "2"],
    answer: 3,
    explanation: "// is floor division — it rounds down, so 5 // 2 is 2.",
  },
  {
    id: "q41",
    question: "What does math.random(1, 6) return?",
    options: [
      "Always 3",
      "A random string",
      "A table",
      "An integer between 1 and 6",
    ],
    answer: 3,
  },
  {
    id: "q42",
    question: "What does math.floor(3.7) return?",
    options: ["4", "3", "3.7", "0"],
    answer: 1,
  },
  {
    id: "q43",
    question: "What does tonumber(\"42\") return?",
    options: [
      "\"42\" (a string)",
      "true",
      "42 (a number)",
      "nil",
    ],
    answer: 2,
  },
  {
    id: "q44",
    question: "Where are the parts in a game's world stored?",
    options: [
      "game.ReplicatedStorage",
      "game.Workspace",
      "game.Players",
      "game.ServerStorage",
    ],
    answer: 1,
  },
  {
    id: "q45",
    question: "Which service tracks the players in your game?",
    options: ["game.Players", "game.Workspace", "game.Lighting", "game.SoundService"],
    answer: 0,
  },
  {
    id: "q46",
    question: "Where does a LocalScript run?",
    options: [
      "On the player's device (client)",
      "On Roblox servers only",
      "Nowhere",
      "In the Output window",
    ],
    answer: 0,
  },
  {
    id: "q47",
    question: "How do you get a player's character model?",
    options: ["player.Model", "player.Torso", "player.Character", "player.Body"],
    answer: 2,
  },
  {
    id: "q48",
    question: "What does Instance.new(\"Part\") do?",
    options: [
      "Deletes a Part",
      "Finds a Part",
      "Loads a model",
      "Creates a new Part",
    ],
    answer: 3,
  },
  {
    id: "q49",
    question: "Which event fires when one part touches another?",
    options: ["Click", "Collided", "Hit", "Touched"],
    answer: 3,
  },
  {
    id: "q50",
    question: "What does CFrame.new(0, 10, 0) describe?",
    options: [
      "Only a color",
      "A position and rotation",
      "A script",
      "A sound",
    ],
    answer: 1,
    explanation: "A CFrame stores both a position and a rotation in 3D space.",
  },
];
