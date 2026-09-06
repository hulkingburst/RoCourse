import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SyncHost } from "@/components/auth/sync-host";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { routing } from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  const title = t("metadataTitle");
  const description = t("metadataDescription");
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: t("metadataTitleTemplate"),
    },
    description,
    keywords: ["Roblox", "Luau", "Lua", "Roblox Studio", "learn to code", "game development", "free course"],
    // Explicit favicon: src/app/icon.png is the current brand mark. Browsers
    // cache /icon.png, so after a logo change a refresh-plus-hard-reload
    // (or a fresh cache) may be needed once — nothing else serves an icon.
    icons: {
      icon: "/icon.png",
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description,
      locale: locale === "es" ? "es_ES" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The proxy (src/proxy.ts) stamps a fresh nonce onto every page view. It is
  // forwarded to next-themes so its inline theme script carries the same
  // nonce and passes the strict Content-Security-Policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={undefined}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            nonce={nonce}
          >
            <AuthProvider>
              {children}
              <SyncHost />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
