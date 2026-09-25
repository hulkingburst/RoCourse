import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="max-w-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="mt-8 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t("emailLabel")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 block break-all font-mono text-base font-medium text-primary underline-offset-4 hover:underline sm:text-lg"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <Button asChild size="lg" className="w-full shrink-0 sm:w-auto">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Mail />
              {t("emailButton")}
            </a>
          </Button>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">{t("responseNote")}</p>
    </div>
  );
}
