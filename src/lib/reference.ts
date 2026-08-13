export const REFERENCE_CATEGORIES = [
  "basics",
  "variables-types",
  "strings",
  "operators",
  "control-flow",
  "functions",
  "tables",
  "tasks-timing",
  "debugging",
] as const;

export type ReferenceCategory = (typeof REFERENCE_CATEGORIES)[number];

export interface ReferenceEntry {
  id: string;
  category: ReferenceCategory;
  code: string;
  links?: { labelKey: string; href: string }[];
}

export const referenceEntries: ReferenceEntry[] = [
  // Basics
  {
    id: "hello-world",
    category: "basics",
    code: `print("Hello, Roblox!")`,
    links: [
      { labelKey: "links.welcome", href: "/lessons/welcome" },
      { labelKey: "links.scripts", href: "/lessons/scripts" },
    ],
  },
  {
    id: "comments",
    category: "basics",
    code: `-- A single-line comment

--[[
  A multi-line
  comment block
]]`,
    links: [{ labelKey: "links.comments", href: "/lessons/comments" }],
  },
  {
    id: "statements",
    category: "basics",
    code: `local x = 5
print(x)  -- no semicolon needed`,
    links: [{ labelKey: "links.variables", href: "/lessons/variables" }],
  },

  // Variables & types
  {
    id: "local-variables",
    category: "variables-types",
    code: `local coins = 100
local name = "Ada"
local isReady = true`,
    links: [{ labelKey: "links.variables", href: "/lessons/variables" }],
  },
  {
    id: "reassigning",
    category: "variables-types",
    code: `local score = 0
score = score + 10  -- same variable, new value
print(score)        --> 10`,
  },
  {
    id: "main-types",
    category: "variables-types",
    code: `local a = 5          -- number
local b = "hello"    -- string
local c = true       -- boolean
local d = nil        -- "no value yet"`,
    links: [{ labelKey: "links.types", href: "/lessons/types" }],
  },
  {
    id: "type-checking",
    category: "variables-types",
    code: `print(type("hi"))   --> string
print(type(5))      --> number
print(type(true))   --> boolean
print(type(nil))    --> nil`,
    links: [{ labelKey: "links.types", href: "/lessons/types" }],
  },
  {
    id: "multiple-assignment",
    category: "variables-types",
    code: `local x, y = 10, 20
x, y = y, x          -- swaps them
print(x, y)          --> 20  10`,
  },

  // Strings
  {
    id: "string-basics",
    category: "strings",
    code: `local greeting = "Hello"
local name = 'World'   -- single quotes work too
print(greeting, name)`,
    links: [{ labelKey: "links.strings", href: "/lessons/strings" }],
  },
  {
    id: "concatenation",
    category: "strings",
    code: `local full = "Hello" .. " " .. "World"
print(full)   --> Hello World`,
    links: [{ labelKey: "links.strings", href: "/lessons/strings" }],
  },
  {
    id: "interpolation",
    category: "strings",
    code: `local coins = 42
print(\`You have {coins} coins!\`)   --> You have 42 coins!`,
    links: [{ labelKey: "links.strings", href: "/lessons/strings" }],
  },
  {
    id: "string-methods",
    category: "strings",
    code: `print(string.upper("hi"))                --> HI
print(string.sub("banana", 1, 3))      --> ban
print(string.find("hello", "ell"))     --> 2  4
print(string.rep("ab", 3))             --> ababab`,
  },

  // Operators
  {
    id: "arithmetic",
    category: "operators",
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
    category: "operators",
    code: `print(5 == 5)     --> true
print(5 ~= 6)     --> true
print(5 < 6)      --> true
print(5 >= 5)     --> true
print("a" < "b")  --> true`,
  },
  {
    id: "boolean-logic",
    category: "operators",
    code: `print(true and false)  --> false
print(true or false)   --> true
print(not true)        --> false`,
  },
  {
    id: "compound-assignment",
    category: "operators",
    code: `local x = 10
x += 5   -- x is now 15
x *= 2   -- x is now 30
x %= 4   -- x is now 2`,
  },

  // Control flow
  {
    id: "if-else",
    category: "control-flow",
    code: `local health = 20

if health <= 0 then
    print("Game over")
elseif health < 30 then
    print("Low health")
else
    print("Doing fine")
end`,
    links: [{ labelKey: "links.conditionals", href: "/lessons/conditionals" }],
  },
  {
    id: "while-loop",
    category: "control-flow",
    code: `local n = 3
while n > 0 do
    print(n)
    n -= 1
end
-- prints 3, 2, 1`,
    links: [{ labelKey: "links.loops", href: "/lessons/loops" }],
  },
  {
    id: "numeric-for",
    category: "control-flow",
    code: `for i = 1, 5 do
    print(i)          -- 1 2 3 4 5
end

for i = 1, 10, 2 do
    print(i)          -- 1 3 5 7 9
end`,
    links: [{ labelKey: "links.for-loops", href: "/lessons/for-loops" }],
  },
  {
    id: "break",
    category: "control-flow",
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
    category: "functions",
    code: `local function greet(name)
    print("Hello, " .. name)
end

greet("Ada")   --> Hello, Ada`,
    links: [{ labelKey: "links.functions", href: "/lessons/functions" }],
  },
  {
    id: "return-values",
    category: "functions",
    code: `local function double(x)
    return x * 2
end

local result = double(21)
print(result)  --> 42`,
    links: [{ labelKey: "links.function-returns", href: "/lessons/function-returns" }],
  },
  {
    id: "multiple-returns",
    category: "functions",
    code: `local function minMax(a, b, c)
    return math.min(a, b, c), math.max(a, b, c)
end

local lo, hi = minMax(3, 9, 5)
print(lo, hi)   --> 3  9`,
  },
  {
    id: "anonymous-functions",
    category: "functions",
    code: `local onJoin = function(player)
    print(player.Name .. " joined!")
end

-- Usually used with events or task.spawn:
playerAdded:Connect(onJoin)`,
    links: [
      { labelKey: "links.functions", href: "/lessons/functions" },
      { labelKey: "links.events", href: "/lessons/events" },
    ],
  },
  {
    id: "varargs",
    category: "functions",
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
    category: "tables",
    code: `local fruits = { "apple", "banana", "cherry" }
print(fruits[1])   --> apple  (indexes start at 1)

local player = { name = "Ada", level = 5 }
print(player.name)      --> Ada
print(player["name"])   --> Ada (same thing)`,
    links: [{ labelKey: "links.tables", href: "/lessons/tables" }],
  },
  {
    id: "dictionary-iteration",
    category: "tables",
    code: `local stats = { coins = 100, xp = 250 }

for key, value in pairs(stats) do
    print(key, value)
end`,
    links: [{ labelKey: "links.tables", href: "/lessons/tables" }],
  },
  {
    id: "list-iteration",
    category: "tables",
    code: `local items = { "sword", "shield", "potion" }

for i, item in ipairs(items) do
    print(i, item)
end`,
    links: [{ labelKey: "links.tables", href: "/lessons/tables" }],
  },
  {
    id: "table-methods",
    category: "tables",
    code: `local list = { 1, 2, 3 }

table.insert(list, 4)   -- { 1, 2, 3, 4 }
table.remove(list, 1)   -- { 2, 3, 4 }

print(#list)            --> 3`,
  },

  // Tasks & timing
  {
    id: "task-wait",
    category: "tasks-timing",
    code: `print("starting")
task.wait(1)          -- wait 1 second
print("later!")`,
    links: [{ labelKey: "links.task-wait", href: "/lessons/task-wait" }],
  },
  {
    id: "task-spawn",
    category: "tasks-timing",
    code: `task.spawn(function()
    task.wait(1)
    print("spawned, 1 second later")
end)

print("this prints immediately")`,
    links: [{ labelKey: "links.task-wait", href: "/lessons/task-wait" }],
  },

  // Debugging
  {
    id: "warn",
    category: "debugging",
    code: `warn("Careful — this value is unexpected")`,
    links: [
      { labelKey: "links.print-debugging", href: "/lessons/print-debugging" },
      { labelKey: "links.output-errors", href: "/lessons/output-errors" },
    ],
  },
  {
    id: "common-mistakes",
    category: "debugging",
    code: `-- Using = instead of == in a condition:
if coins = 5 then end   -- error! use ==

-- Forgetting then / end:
if true then
    print("missing end")
-- error: Expected 'end' (to close 'if' at line 1)`,
    links: [
      { labelKey: "links.common-errors", href: "/lessons/common-errors" },
      { labelKey: "links.output-errors", href: "/lessons/output-errors" },
    ],
  },
];
