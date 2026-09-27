import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  CONTACT_EMAIL,
  CONTACT_X_HANDLE,
  CONTACT_X_URL,
} from "@/lib/site";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t("emailLabel")}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-2 block break-all font-mono text-base font-medium text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
          <Button asChild size="lg" className="w-full">
            <a href={`mailto:${CONTACT_EMAIL}`}>
              <Mail />
              {t("emailButton")}
            </a>
          </Button>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{t("xLabel")}</p>
            <a
              href={CONTACT_X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block break-all font-mono text-base font-medium text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_X_HANDLE}
            </a>
          </div>
          <Button asChild size="lg" className="w-full">
            <a href={CONTACT_X_URL} target="_blank" rel="noopener noreferrer">
              <XIcon className="h-4 w-4" />
              {t("xButton")}
            </a>
          </Button>
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">{t("responseNote")}</p>
    </div>
  );
}
