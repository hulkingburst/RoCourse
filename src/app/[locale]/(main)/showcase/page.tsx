import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Gamepad2,
  ShieldCheck,
  Trophy,
  User,
  ExternalLink,
} from "lucide-react";
import { getApprovedShowcase } from "@/lib/showcase";
import type { ShowcaseGame } from "@/lib/showcase-shared";
import { SubmitGameDialog } from "@/components/showcase/submit-dialog";
import { Badge } from "@/components/ui/badge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Student Games Showcase — RoCourse",
  description:
    "Complete Roblox games built end to end by RoCourse graduates. Reviewed before listing — a look at what you'll be able to make.",
  alternates: { canonical: "/showcase" },
};

async function GameCard({ game }: { game: ShowcaseGame }) {
  const t = await getTranslations("showcase");
  return (
    <article className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Gamepad2 className="h-3 w-3" />
              {t("approvedTag")}
            </Badge>
            {game.handle ? (
              <Link
                href={`/u/${game.handle}`}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <User className="h-3 w-3" />
                {game.authorName}
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {game.authorName}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-snug">
            {game.gameName}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {game.description}
          </p>
        </div>
        {game.gameUrl && (
          <a
            href={game.gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            {t("playGame")}
          </a>
        )}
      </div>
    </article>
  );
}

export default async function ShowcasePage() {
  const t = await getTranslations("showcase");
  const games = await getApprovedShowcase();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>
          <Link
            href="/leaderboard"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
          >
            <Trophy className="h-3.5 w-3.5" />
            {t("seeLeaderboard")}
          </Link>
        </div>
        <SubmitGameDialog />
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-6 py-16 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <SubmitGameDialog />
            <Link
              href="/lessons/welcome"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {t("startCourse")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t("footerNote")}
      </p>
    </div>
  );
}