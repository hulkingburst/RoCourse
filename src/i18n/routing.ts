import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // English lives at the root; every other locale gets a /<locale> prefix.
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
};
