import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  Bug,
  CalendarDays,
  ExternalLink,
  Gamepad2,
  GraduationCap,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: { canonical: "/guides" },
  };
}

const guides = [
  {
    href: "/guides/how-to-make-a-game-in-roblox",
    icon: Gamepad2,
    keyPrefix: "makeGame",
  },
  {
    href: "/guides/roblox-scripting-for-beginners",
    icon: BookOpen,
    keyPrefix: "scriptingBeginners",
  },
  {
    href: "/guides/what-is-luau",
    icon: GraduationCap,
    keyPrefix: "whatIsLuau",
  },
  {
    href: "/guides/fix-common-luau-errors",
    icon: Bug,
    keyPrefix: "fixErrors",
  },
  {
    href: "/guides/learn-roblox-scripting-in-a-week",
    icon: CalendarDays,
    keyPrefix: "learnWeek",
  },
];

export default async function GuidesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("intro")}</p>

      <div className="mt-8 grid gap-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group rounded-xl border bg-card p-5 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <guide.icon className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold group-hover:underline">
                    {t(`${guide.keyPrefix}.title`)}
                  </h2>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t(`${guide.keyPrefix}.description`)}
                </p>
              </div>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
