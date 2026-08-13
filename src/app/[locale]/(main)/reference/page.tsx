import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { REFERENCE_CATEGORIES, referenceEntries } from "@/lib/reference";
import { ReferenceClient } from "@/components/reference/reference-client";

export const metadata: Metadata = {
  title: "Luau Cheat Sheet & Roblox Reference",
  description:
    "A searchable Luau cheat sheet: syntax, functions, loops, tables, and Roblox scripting patterns.",
  alternates: { canonical: "/reference" },
};

export default async function ReferencePage() {
  const t = await getTranslations("reference");
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t("pageIntro")}</p>
      </div>
      <ReferenceClient
        entries={referenceEntries}
        categories={REFERENCE_CATEGORIES}
      />
    </div>
  );
}
