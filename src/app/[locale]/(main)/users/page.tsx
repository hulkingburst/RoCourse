import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Trophy } from "lucide-react";
import { getPublicUserSummaries } from "@/lib/users";
import { UsersClient } from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luau Learners Directory",
  description: "Find other people learning Luau on RoCourse.",
  alternates: { canonical: "/users" },
};

export default async function UsersPage() {
  const t = await getTranslations("users");
  const users = await getPublicUserSummaries();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("intro")}</p>
        <Link
          href="/showcase"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <Trophy className="h-3.5 w-3.5" />
          {t("seeShowcase")}
        </Link>
      </div>
      <UsersClient users={users} />
    </div>
  );
}
