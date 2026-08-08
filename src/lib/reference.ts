export const REFERENCE_CATEGORIES = [
  "Basics",
  "Variables & types",
  "Strings",
  "Operators",
  "Control flow",
  "Functions",
  "Tables",
  "Tasks & timing",
  "Debugging",
] as const;

export type ReferenceCategory = (typeof REFERENCE_CATEGORIES)[number];

export interface ReferenceEntry {
  id: string;
  category: ReferenceCategory;
  title: string;
  description: string;
  code: string;
  links?: { label: string; href: string }[];
}

export const referenceEntries: ReferenceEntry[] = [
  // Basics
  {
    id: "hello-world",
    category: "Basics",
    title: "Hello, world",
    description: "The classic first program. Every Luau script can call print.",
    code: `print("Hello, Roblox!")`,
    links: [
      { label: "Welcome lesson", href: "/lessons/welcome" },
      { label: "Scripts", href: "/lessons/scripts" },
    ],
  },
  {
    id: "comments",
    category: "Basics",
    title: "Comments",
    description: "Comments are notes for you (and future-you) — Luau ignores them.",
    code: `-- A single-line comment

--[[
  A multi-line
  comment block
]]`,
    links: [{ label: "Comments", href: "/lessons/comments" }],
  },
  {
    id: "statements",
    category: "Basics",
    title: "Statements",
    description: "Semicolons are optional. One statement per line is the usual style.",
    code: `local x = 5
print(x)  -- no semicolon needed`,
    links: [{ label: "Variables", href: "/lessons/variables" }],
  },

  // Variables & types
  {
    id: "local-variables",
    category: "Variables & types",
    title: "Local variables",
    description: "Declare values with local. Locals stay inside the block they live in.",
    code: `local coins = 100
local name = "Ada"
local isReady = true`,
    links: [{ label: "Variables", href: "/lessons/variables" }],
  },
  {
    id: "reassigning",
    category: "Variables & types",
    title: "Reassigning variables",
    description: "Variables hold one value at a time — you can change what they hold.",
    code: `local score = 0
score = score + 10  -- same variable, new value
print(score)        --> 10`,
  },
  {
    id: "main-types",
    category: "Variables & types",
    title: "The main types",
    description: "Numbers, strings, booleans, and nil are the core building blocks.",
    code: `local a = 5          -- number
local b = "hello"    -- string
local c = true       -- boolean
local d = nil        -- "no value yet"`,
    links: [{ label: "Types", href: "/lessons/types" }],
  },
  {
    id: "type-checking",
    category: "Variables & types",
    title: "Check a value's type",
    description: "type() returns the name of a value's type as a string.",
    code: `print(type("hi"))   --> string
print(type(5))      --> number
print(type(true))   --> boolean
print(type(nil))    --> nil`,
    links: [{ label: "Types", href: "/lessons/types" }],
  },
  {
    id: "multiple-assignment",
    category: "Variables & types",
    title: "Multiple assignment",
    description: "Assign several variables at once, and use it to swap values.",
    code: `local x, y = 10, 20
x, y = y, x          -- swaps them
print(x, y)          --> 20  10`,
  },

  // Strings
  {
    id: "string-basics",
    category: "Strings",
    title: "String basics",
    description: "Text in Luau is a string. Double or single quotes both work.",
    code: `local greeting = "Hello"
local name = 'World'   -- single quotes work too
print(greeting, name)`,
    links: [{ label: "Strings", href: "/lessons/strings" }],
  },
  {
    id: "concatenation",
    category: "Strings",
    title: "Concatenation",
    description: "Use .. to join strings together.",
    code: `local full = "Hello" .. " " .. "World"
print(full)   --> Hello World`,
    links: [{ label: "Strings", href: "/lessons/strings" }],
  },
  {
    id: "interpolation",
    category: "Strings",
    title: "String interpolation",
    description: "Backticks let you embed values directly inside a string.",
    code: `local coins = 42
print(\`You have {coins} coins!\`)   --> You have 42 coins!`,
    links: [{ label: "Strings", href: "/lessons/strings" }],
  },
  {
    id: "string-methods",
    category: "Strings",
    title: "Common string helpers",
    description: "The string library covers the day-to-day text operations.",
    code: `print(string.upper("hi"))                --> HI
print(string.sub("banana", 1, 3))      --> ban
print(string.find("hello", "ell"))     --> 2  4
print(string.rep("ab", 3))             --> ababab`,
  },

  // Operators
  {
    id: "arithmetic",
    category: "Operators",
    title: "Arithmetic",
    description: "The usual math, plus floor division and remainder.",
    code: `print(7 + 3)   --> 10
print(7 - 3)   --> 4
print(7 * 3)   --> 21
print(7 / 3)   --> 2.333...
print(7 // 3)  --> 2   (floor division)
print(7 % 3)   --> 1   (remainder)
print(2 ^ 3)   --> 8   (power)`,
  },
  {
    id: "comparison",
    category: "Operators",
    title: "Comparison",
    description: "Compare values for equality and ordering. ~= means \"not equal\".",
    code: `print(5 == 5)     --> true
print(5 ~= 6)     --> true
print(5 < 6)      --> true
print(5 >= 5)     --> true
print("a" < "b")  --> true`,
  },
  {
    id: "boolean-logic",
    category: "Operators",
    title: "Boolean logic",
    description: "and, or, and not combine true/false conditions.",
    code: `print(true and false)  --> false
print(true or false)   --> true
print(not true)        --> false`,
  },
  {
    id: "compound-assignment",
    category: "Operators",
    title: "Compound assignment",
    description: "Shorthand for updating a variable with an operation.",
    code: `local x = 10
x += 5   -- x is now 15
x *= 2   -- x is now 30
x %= 4   -- x is now 2`,
  },

  // Control flow
  {
    id: "if-else",
    category: "Control flow",
    title: "if / elseif / else",
    description: "Run different code depending on a condition.",
    code: `local health = 20

if health <= 0 then
    print("Game over")
elseif health < 30 then
    print("Low health")
else
    print("Doing fine")
end`,
    links: [{ label: "Conditionals", href: "/lessons/conditionals" }],
  },
  {
    id: "while-loop",
    category: "Control flow",
    title: "while loop",
    description: "Repeat while a condition stays true.",
    code: `local n = 3
while n > 0 do
    print(n)
    n -= 1
end
-- prints 3, 2, 1`,
    links: [{ label: "Loops", href: "/lessons/loops" }],
  },
  {
    id: "numeric-for",
    category: "Control flow",
    title: "Numeric for loop",
    description: "Count up (or down) over a range. A third number sets the step.",
    code: `for i = 1, 5 do
    print(i)          -- 1 2 3 4 5
end

for i = 1, 10, 2 do
    print(i)          -- 1 3 5 7 9
end`,
    links: [{ label: "For loops", href: "/lessons/for-loops" }],
  },
  {
    id: "break",
    category: "Control flow",
    title: "break",
    description: "Exit a loop early from inside it.",
    code: `local n = 0
while true do
    n += 1
    if n >= 10 then break end
end
print(n)  --> 10`,
  },

  // Functions
  {
    id: "define-call",
    category: "Functions",
    title: "Define & call",
    description: "Bundle code into a named function, then call it with arguments.",
    code: `local function greet(name)
    print("Hello, " .. name)
end

greet("Ada")   --> Hello, Ada`,
    links: [{ label: "Functions", href: "/lessons/functions" }],
  },
  {
    id: "return-values",
    category: "Functions",
    title: "Return values",
    description: "A function can hand a value back to whoever called it.",
    code: `local function double(x)
    return x * 2
end

local result = double(21)
print(result)  --> 42`,
    links: [{ label: "Function returns", href: "/lessons/function-returns" }],
  },
  {
    id: "multiple-returns",
    category: "Functions",
    title: "Multiple returns",
    description: "Return several values at once and capture them all.",
    code: `local function minMax(a, b, c)
    return math.min(a, b, c), math.max(a, b, c)
end

local lo, hi = minMax(3, 9, 5)
print(lo, hi)   --> 3  9`,
  },
  {
    id: "anonymous-functions",
    category: "Functions",
    title: "Anonymous functions",
    description: "Functions are values too — pass them around as callbacks.",
    code: `local onJoin = function(player)
    print(player.Name .. " joined!")
end

-- Usually used with events or task.spawn:
playerAdded:Connect(onJoin)`,
    links: [
      { label: "Functions", href: "/lessons/functions" },
      { label: "Events", href: "/lessons/events" },
    ],
  },
  {
    id: "varargs",
    category: "Functions",
    title: "Varargs",
    description: "... accepts any number of extra arguments.",
    code: `local function sum(...)
    local total = 0
    for _, value in ipairs({ ... }) do
        total += value
    end
    return total
end

print(sum(1, 2, 3, 4))   --> 10`,
  },

  // Tables
  {
    id: "create-index",
    category: "Tables",
    title: "Create & index",
    description: "Tables hold multiple values. Lists start at index 1; dictionaries use keys.",
    code: `local fruits = { "apple", "banana", "cherry" }
print(fruits[1])   --> apple  (indexes start at 1)

local player = { name = "Ada", level = 5 }
print(player.name)      --> Ada
print(player["name"])   --> Ada (same thing)`,
    links: [{ label: "Tables", href: "/lessons/tables" }],
  },
  {
    id: "dictionary-iteration",
    category: "Tables",
    title: "Iterate a dictionary",
    description: "pairs() visits every key and value.",
    code: `local stats = { coins = 100, xp = 250 }

for key, value in pairs(stats) do
    print(key, value)
end`,
    links: [{ label: "Tables", href: "/lessons/tables" }],
  },
  {
    id: "list-iteration",
    category: "Tables",
    title: "Iterate a list",
    description: "ipairs() walks a list in order, 1 to #list.",
    code: `local items = { "sword", "shield", "potion" }

for i, item in ipairs(items) do
    print(i, item)
end`,
    links: [{ label: "Tables", href: "/lessons/tables" }],
  },
  {
    id: "table-methods",
    category: "Tables",
    title: "Table helpers",
    description: "table.insert and table.remove keep lists tidy.",
    code: `local list = { 1, 2, 3 }

table.insert(list, 4)   -- { 1, 2, 3, 4 }
table.remove(list, 1)   -- { 2, 3, 4 }

print(#list)            --> 3`,
  },

  // Tasks & timing
  {
    id: "task-wait",
    category: "Tasks & timing",
    title: "task.wait",
    description: "Pause the current script for a number of seconds.",
    code: `print("starting")
task.wait(1)          -- wait 1 second
print("later!")`,
    links: [{ label: "task.wait", href: "/lessons/task-wait" }],
  },
  {
    id: "task-spawn",
    category: "Tasks & timing",
    title: "task.spawn",
    description: "Run a function without blocking the code after it.",
    code: `task.spawn(function()
    task.wait(1)
    print("spawned, 1 second later")
end)

print("this prints immediately")`,
    links: [{ label: "task.wait", href: "/lessons/task-wait" }],
  },

  // Debugging
  {
    id: "warn",
    category: "Debugging",
    title: "warn",
    description: "Print a message that stands out in the Output window.",
    code: `warn("Careful — this value is unexpected")`,
    links: [
      { label: "Print debugging", href: "/lessons/print-debugging" },
      { label: "Output & errors", href: "/lessons/output-errors" },
    ],
  },
  {
    id: "common-mistakes",
    category: "Debugging",
    title: "Common mistakes",
    description: "The two errors beginners hit most: = instead of == and a missing end.",
    code: `-- Using = instead of == in a condition:
if coins = 5 then end   -- error! use ==

-- Forgetting then / end:
if true then
    print("missing end")
-- error: Expected 'end' (to close 'if' at line 1)`,
    links: [
      { label: "Common errors", href: "/lessons/common-errors" },
      { label: "Output & errors", href: "/lessons/output-errors" },
    ],
  },
];
