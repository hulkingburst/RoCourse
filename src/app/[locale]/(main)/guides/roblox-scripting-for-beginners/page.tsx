import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: t("scriptingBeginners.metaTitle"),
    description: t("scriptingBeginners.metaDescription"),
    alternates: { canonical: "/guides/roblox-scripting-for-beginners" },
  };
}

const scriptingJsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Roblox Scripting for Beginners",
  description:
    "A beginner-friendly guide to Roblox scripting in Luau: variables, functions, loops, conditionals, events, and debugging, with free hands-on practice.",
  educationalLevel: "beginner",
  isAccessibleForFree: true,
  inLanguage: "en",
  provider: {
    "@type": "Organization",
    name: "RoCourse",
    sameAs: SITE_URL,
  },
};

export default async function ScriptingBeginnersGuide({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={scriptingJsonLd} />
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="text-3xl font-bold tracking-tight">
        {t("scriptingBeginners.title")}
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        {t("scriptingBeginners.intro")}
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <h2>{t("scriptingBeginners.sections.scriptingMeans")}</h2>
        <p>
          Roblox games are written in{" "}
          <Link href="/guides/what-is-luau">Luau</Link>, a fast, beginner-friendly
          version of the Lua language. Scripts are text files that live inside
          your game — usually in a{" "}
          <Link href="/lessons/scripts">Script</Link> or{" "}
          <Link href="/lessons/modules">ModuleScript</Link> — and they run to
          make the game respond to players.
        </p>

        <h2>{t("scriptingBeginners.sections.firstScript")}</h2>
        <p>
          Open Roblox Studio, insert a Script into the Workspace, and write{" "}
          <code>print(&quot;Hello, Roblox!&quot;)</code>. Hit Play and check the
          Output window. You&apos;ve just written your first script. The{" "}
          <Link href="/lessons/play-testing">Playtesting lesson</Link> runs you
          through exactly this, and{" "}
          <Link href="/lessons/output-errors">The Output window</Link> teaches
          you to read what the game tells you.
        </p>

        <h2>{t("scriptingBeginners.sections.fiveIdeas")}</h2>
        <p>
          Every game — from a coin tycoon to a multiplayer obby — is a
          combination of these five ideas:
        </p>
        <ul>
          <li>
            <strong>Variables</strong> ({<Link href="/lessons/variables">lesson</Link>})
            — store values like a player&apos;s coins.
          </li>
          <li>
            <strong>Functions</strong> ({<Link href="/lessons/functions">lesson</Link>})
            — packages of instructions you can call anytime.
          </li>
          <li>
            <strong>Loops</strong> ({<Link href="/lessons/loops">lesson</Link>}) —
            run something again and again, like idle income.
          </li>
          <li>
            <strong>Conditionals</strong> ({<Link href="/lessons/conditionals">lesson</Link>})
            — make decisions with <code>if</code> and <code>else</code>.
          </li>
          <li>
            <strong>Events</strong> ({<Link href="/lessons/events">lesson</Link>})
            — react when players do things, like touching a part.
          </li>
        </ul>

        <h2>{t("scriptingBeginners.sections.readErrors")}</h2>
        <p>
          Errors are not a failure — they&apos;re the game telling you exactly
          what to fix. The{" "}
          <Link href="/lessons/debugging">Debugging</Link>,{" "}
          <Link href="/lessons/print-debugging">print debugging</Link>, and{" "}
          <Link href="/lessons/common-errors">classic errors</Link> lessons
          teach you to read the Output window, spot the usual mistakes, and fix
          them quickly. Most beginners spend more time debugging than writing —
          that&apos;s normal.
        </p>

        <h2>{t("scriptingBeginners.sections.practiceFree")}</h2>
        <p>
          You can experiment in the{" "}
          <Link href="/playground">browser playground</Link> without even
          installing Studio, and use the{" "}
          <Link href="/reference">Luau cheat sheet</Link> as a quick reference.
          When you&apos;re ready to build in a real game, the{" "}
          <Link href="/lessons">free course</Link> takes you from your first
          script to a published game — no account needed.
        </p>
      </div>
    </div>
  );
}
