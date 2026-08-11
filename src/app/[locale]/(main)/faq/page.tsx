import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getCourseStructure } from "@/lib/lessons";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "RoCourse FAQ — Learn Luau & Roblox, Answered",
  description:
    "Frequently asked questions about RoCourse: is it really free, do I need experience, what is Luau, and how long does the course take?",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const totalHours = Math.round(
    getCourseStructure()
      .flatMap((section) => section.lessons)
      .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0) / 60
  );

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is RoCourse really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every lesson, activity, quiz, and the Luau playground are completely free. There is no paywall, no premium tier, and no sign-up required to use the course.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need any coding experience to start?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The course starts from absolute zero and assumes you have never written a line of code. You build real Roblox game code one tiny step at a time.",
        },
      },
      {
        "@type": "Question",
        name: "What do I need to get started?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A computer that can run Roblox Studio (it is free to download) and an internet browser. The first lesson walks you through installing Studio step by step.",
        },
      },
      {
        "@type": "Question",
        name: "What is Luau?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Luau is the scripting language that every Roblox game uses. It is a faster, safer version of the Lua language, designed specifically for game development. RoCourse teaches Luau from the ground up.",
        },
      },
      {
        "@type": "Question",
        name: "How long does the course take?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Around ${totalHours} hours in total across 70 short lessons, but you work at your own pace. Most lessons take 5 to 15 minutes each.`,
        },
      },
      {
        "@type": "Question",
        name: "Can I use RoCourse without an account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Everything works as a guest and your progress is saved in your browser. Accounts are optional and only exist to sync your progress across devices.",
        },
      },
      {
        "@type": "Question",
        name: "Do I get a certificate?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. When you finish the course, you can download a printable certificate of completion as a PNG or PDF.",
        },
      },
      {
        "@type": "Question",
        name: "Is RoCourse for kids?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RoCourse is designed for people aged 13 and up. It is a hands-on, building-first course — you learn by making real games, not by memorizing theory.",
        },
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <JsonLd data={faqJsonLd} />
      <h1 className="text-3xl font-bold tracking-tight">
        Frequently asked questions
      </h1>
      <p className="mt-2 text-muted-foreground">
        Everything people usually ask about RoCourse. Something missing? Use
        the feedback button in the footer and we&apos;ll add it.
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <h2>Is RoCourse really free?</h2>
        <p>
          Yes. Every lesson, activity, quiz, and the{" "}
          <Link href="/playground">Luau playground</Link> are completely free.
          There is no paywall, no premium tier, and no sign-up required to use
          the course.
        </p>

        <h2>Do I need any coding experience to start?</h2>
        <p>
          No. The course starts from absolute zero and assumes you have never
          written a line of code. You build real Roblox game code one tiny step
          at a time, and each lesson only moves forward when you solve an
          activity.
        </p>

        <h2>What do I need to get started?</h2>
        <p>
          A computer that can run{" "}
          <Link href="/lessons/installing-studio">Roblox Studio</Link> (it is
          free to download) and an internet browser. The first lesson walks
          you through installing Studio step by step.
        </p>

        <h2>What is Luau?</h2>
        <p>
          Luau is the scripting language that every Roblox game uses. It is a
          faster, safer version of the Lua language, designed specifically for
          game development. RoCourse teaches Luau from the ground up — see the{" "}
          <Link href="/guides/what-is-luau">full explainer</Link> or the{" "}
          <Link href="/reference">Luau cheat sheet</Link>.
        </p>

        <h2>How long does the course take?</h2>
        <p>
          Around {totalHours} hours in total across 70 short lessons, but you
          work at your own pace. Most lessons take 5 to 15 minutes each, and
          your progress autosaves as you go.
        </p>

        <h2>Can I use RoCourse without an account?</h2>
        <p>
          Yes. Everything works as a guest and your progress is saved in your
          browser. Accounts are optional and only exist to sync your progress
          across devices.
        </p>

        <h2>Do I get a certificate?</h2>
        <p>
          Yes. When you finish the course, you can download a printable{" "}
          <Link href="/certificate">certificate of completion</Link> as a PNG
          or PDF.
        </p>

        <h2>Is RoCourse for kids?</h2>
        <p>
          RoCourse is designed for people aged 13 and up. It is a hands-on,
          building-first course — you learn by making real games, not by
          memorizing theory. If you want to jump in,{" "}
          <Link href="/lessons/welcome">start with the welcome lesson</Link>.
        </p>

        <p>
          Still curious? The full details live in our{" "}
          <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/terms">Terms of Service</Link>, or reach out at{" "}
          <a
            href="https://github.com/hulkingburst/RoCourse"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/hulkingburst/RoCourse
          </a>
          .
        </p>
      </div>
    </div>
  );
}
