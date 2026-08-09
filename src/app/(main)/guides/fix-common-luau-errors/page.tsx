import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Fix Common Luau Errors — Roblox Scripting Mistakes Explained",
  description:
    "The most common Luau errors beginners hit in Roblox Studio, explained: what each error message means, and the exact fix — with real code examples.",
  alternates: { canonical: "/guides/fix-common-luau-errors" },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Fix Common Luau Errors",
  description:
    "The most common Luau errors beginners hit in Roblox Studio, what each error message means, and how to fix them.",
  about: "Luau scripting for Roblox",
};

const errors = [
  {
    id: "index-nil",
    title: "Attempt to index nil with \u201cPosition\u201d",
    message: "Attempt to index nil with \u201cPosition\u201d",
    code: `local part = workspace.MyPart
print(part.Position)`,
    cause:
      "`MyPart` doesn\u2019t exist yet — or doesn\u2019t exist under that exact name. When a part isn\u2019t in the Workspace, `workspace.MyPart` is `nil`, and you can\u2019t read a property off nothing.",
    fix: `local part = workspace:WaitForChild("MyPart")
print(part.Position)`,
    fixText:
      "`WaitForChild` pauses the script until the part exists. This is the standard fix for anything that loads in later — like a player\u2019s character or an item you clone in. See the ",
    fixLink: { href: "/lessons/workspace-parts", label: "Workspace and parts lesson" },
  },
  {
    id: "arithmetic-nil",
    title: "Attempt to perform arithmetic (add) on nil value",
    message: "Attempt to perform arithmetic (add) on a nil value",
    code: `local coins
coins = coins + 10
print(coins)`,
    cause:
      "`coins` was declared but never given a starting value, so it\u2019s `nil`. Adding 10 to nothing isn\u2019t allowed.",
    fix: `local coins = 0
coins = coins + 10
print(coins)`,
    fixText:
      "Give the variable a real starting value. `0` for numbers, `false` for booleans, and `{}` for tables. The ",
    fixLink: { href: "/lessons/variables", label: "variables lesson" },
  },
  {
    id: "call-nil",
    title: "Attempt to call a nil value",
    message: "Attempt to call a nil value",
    code: `makeCoins()`,
    cause:
      "You\u2019re calling a function that doesn\u2019t exist. Either it hasn\u2019t been defined yet (scripts run top to bottom), or the name is spelled differently somewhere.",
    fix: `local function makeCoins()
    return 5
end

print(makeCoins())`,
    fixText:
      "Define the function before you call it, and check the spelling matches exactly. The ",
    fixLink: { href: "/lessons/functions", label: "functions lesson" },
  },
  {
    id: "undefined-global",
    title: "Undefined global \u201ccoin\u201d",
    message: "Undefined global \u201ccoin\u201d",
    code: `local coins = 0
coins = coins + 10
print(coin)`,
    cause:
      "A typo — you wrote `coin`, but the variable is `coins`. Roblox Studio warns you about globals you never declared, which catches exactly this kind of mistake.",
    fix: `local coins = 0
coins = coins + 10
print(coins)`,
    fixText:
      "Use `local` for every variable and let Studio\u2019s warning point at the misspelled name. The ",
    fixLink: { href: "/lessons/variable-naming", label: "naming variables lesson" },
  },
  {
    id: "expected-end",
    title: "Expected \u201cend\u201d (to close a block)",
    message: "Expected \u201cend\u201d (to close a block) at line 5",
    code: `if coins > 10 then
    print("Rich!")
-- the "end" is missing`,
    cause:
      "Every `if`, `function`, `for`, and `while` has to be closed with an `end`. The error tells you exactly which line the block opened on, so look there first.",
    fix: `if coins > 10 then
    print("Rich!")
end`,
    fixText:
      "Match every opening keyword with an `end`. Formatting with consistent indentation makes missing ones obvious. The ",
    fixLink: { href: "/lessons/conditionals", label: "conditionals lesson" },
  },
  {
    id: "infinite-yield",
    title: "Infinite yield possible",
    message: "Infinite yield possible on \u201cworkspace:WaitForChild(\u201cMyPart\u201d)\u201d",
    code: `local part = workspace:WaitForChild("MyPart")`,
    cause:
      "A warning, not an error — `WaitForChild` waited a while and the thing still doesn\u2019t exist. Often the name is wrong, or the part never loads in this script\u2019s context.",
    fix: `local part = workspace:FindFirstChild("MyPart")
if part then
    print(part.Name)
end`,
    fixText:
      "Use `FindFirstChild` and check for `nil` when you\u2019re not sure the object exists. For things that genuinely load later, `WaitForChild` is still the right tool — just double-check the name. The ",
    fixLink: { href: "/lessons/instances", label: "instances lesson" },
  },
  {
    id: "wrong-context",
    title: "The server is not currently using\u2026 / nil LocalPlayer",
    message: "Players.LocalPlayer is nil",
    code: `-- in a server (Script) object
local player = game.Players.LocalPlayer
print(player.Name)`,
    cause:
      "`LocalPlayer` only exists on the client. A server script can\u2019t see it — there\u2019s no single \u201cyour\u201d player from the server\u2019s point of view.",
    fix: `game.Players.PlayerAdded:Connect(function(player)
    print(player.Name)
end)`,
    fixText:
      "On the server, react to `PlayerAdded` instead. The same rule explains most \u201ccant find X here\u201d bugs: match your code to where it runs. The ",
    fixLink: { href: "/lessons/remotes", label: "RemoteEvents lesson" },
  },
  {
    id: "character-nil",
    title: "Attempt to index nil with \u201cHumanoid\u201d (character)",
    message: "Attempt to index nil with \u201cHumanoid\u201d",
    code: `local player = game.Players.PlayerAdded:Wait()
local humanoid = player.Character.Humanoid`,
    cause:
      "A player\u2019s character isn\u2019t loaded yet — it spawns a moment after they join. Reading `.Character` right away gives you `nil`.",
    fix: `local function onCharacter(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        print(humanoid.Health)
    end)
end

game.Players.PlayerAdded:Connect(onCharacter)`,
    fixText:
      "Wait for `CharacterAdded`, then `WaitForChild(\"Humanoid\")`. The ",
    fixLink: { href: "/lessons/characters", label: "characters lesson" },
  },
];

export default function FixCommonLuauErrorsGuide() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={articleJsonLd} />
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
        Guides
      </p>
      <h1 className="text-3xl font-bold tracking-tight">Fix Common Luau Errors</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Eight error messages almost every Roblox scripter meets — what they
        mean, and the fix. Bookmark this page for when Studio yells at you.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <p>
          Error messages look scary, but they&apos;re actually a{" "}
          <strong>map to the bug</strong>. Every message names what went wrong
          and usually which line. If you can read one, you can fix it. These
          are the ones you&apos;ll hit first — all of them are covered in
          detail inside the free{" "}
          <Link href="/lessons/output-errors">course lessons</Link>.
        </p>

        {errors.map((error) => (
          <div key={error.id}>
            <h2>{error.title}</h2>
            <pre className="rounded-lg border bg-muted p-3 text-[13px]">
              <code>{error.message}</code>
            </pre>
            <p>
              <strong>The code that triggers it:</strong>
            </p>
            <pre className="rounded-lg border bg-muted p-3 text-[13px]">
              <code>{error.code}</code>
            </pre>
            <p>{error.cause}</p>
            <p>
              <strong>The fix:</strong>
            </p>
            <pre className="rounded-lg border bg-muted p-3 text-[13px]">
              <code>{error.fix}</code>
            </pre>
            <p>
              {error.fixText}
              <Link href={error.fixLink.href}>{error.fixLink.label}</Link>
              &nbsp;teaches the concept properly.
            </p>
          </div>
        ))}

        <h2>When the fix isn&apos;t obvious</h2>
        <p>
          If an error is still confusing, don&apos;t guess —{" "}
          <strong>read the error, then narrow it down</strong>. The{" "}
          <Link href="/lessons/debugging">debugging lesson</Link> teaches a
          step-by-step method for reading errors like a pro, and{" "}
          <Link href="/lessons/print-debugging">print debugging</Link> shows
          how to watch your code run line by line.
        </p>

        <h2>Practice without pressure</h2>
        <p>
          The course includes{" "}
          <Link href="/lessons/bug-hunt-first">bug-hunt exercises</Link> where
          you deliberately fix broken code — the fastest way to make these
          errors feel familiar instead of frightening.
        </p>
      </div>
    </div>
  );
}
