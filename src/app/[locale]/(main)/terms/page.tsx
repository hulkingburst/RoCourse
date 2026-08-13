import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: { canonical: "/terms" },
  };
}

const LAST_UPDATED = "August 8, 2026";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated", { date: LAST_UPDATED })}
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <p>
          By using RoCourse (&ldquo;the site&rdquo;), you agree to these terms
          and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don&apos;t agree,
          please don&apos;t use the site.
        </p>

        <h2>{t("shortVersion")}</h2>
        <ul>
          <li>RoCourse is a free, interactive course. You can use it as a guest or with an account.</li>
          <li>You must be at least 13 years old (or the minimum age that applies to you) to create an account.</li>
          <li>The course and code are protected by the PolyForm Strict License.</li>
          <li>Don&apos;t misuse the site, and only submit resources you have the right to share.</li>
          <li>We are not affiliated with or endorsed by Roblox Corporation.</li>
        </ul>

        <h2>{t("accounts")}</h2>
        <ul>
          <li>
            To create an account you must be at least 13 years old, or the
            minimum age required in your country, and if you are below the
            applicable age you must have your parent&apos;s or guardian&apos;s
            permission.
          </li>
          <li>Provide accurate information and keep your password secure. You are responsible for activity on your account.</li>
          <li>We may suspend or close accounts that break these terms.</li>
        </ul>

        <h2>{t("intellectualProperty")}</h2>
        <p>
          The RoCourse code and course content are made available under the{" "}
          <a
            href="https://polyformproject.org/licenses/strict/1.0.0"
            target="_blank"
            rel="noopener noreferrer"
          >
            PolyForm Strict License 1.0.0
          </a>{" "}
          (see the <code>LICENSE</code> file in the repository). You may read,
          run, and learn from it for any noncommercial purpose. Redistributing
          the code or creating derivative versions of it, or using it
          commercially, requires permission.
        </p>
        <p>
          The in-browser Luau playground includes a build of{" "}
          <a href="https://luau.org" target="_blank" rel="noopener noreferrer">
            Luau
          </a>
          , which is MIT-licensed (Copyright (c) 2019-2025 Roblox Corporation;
          Copyright (c) 1994-2019 Lua.org, PUC-Rio). The license text is
          included with the bundled files.
        </p>
        <p>
          <strong>Roblox, Roblox Studio, and Luau are properties of Roblox
          Corporation (and Luau is used under its MIT license).</strong>{" "}
          RoCourse is an independent educational project. It is not affiliated
          with, endorsed by, or sponsored by Roblox Corporation.
        </p>

        <h2>{t("userSubmissions")}</h2>
        <ul>
          <li>
            When you submit a resource you represent that you own it or have
            the rights to share it, and that it doesn&apos;t infringe anyone
            else&apos;s rights.
          </li>
          <li>
            By submitting, you grant us a license to host, review, and publish
            the submission on the site.
          </li>
          <li>We review submissions before publishing and may reject or remove any submission at any time.</li>
          <li>
            If you believe something on the site infringes your copyright,
            contact us (see the contact section in our{" "}
            <Link href="/privacy">Privacy Policy</Link>) and we will investigate and
            remove it.
          </li>
        </ul>

        <h2>{t("certificate")}</h2>
        <p>
          The completion certificate acknowledges that you finished the course.
          It is not an accredited credential, diploma, or qualification.
        </p>

        <h2>{t("acceptableUse")}</h2>
        <p>
          Don&apos;t try to break, overload, or disrupt the site or its
          services; scrape it abusively; or use it to spam or harass others.
        </p>

        <h2>{t("noWarranty")}</h2>
        <p>
          The site is provided &ldquo;as is&rdquo; without warranties of any
          kind. To the extent permitted by law, we are not liable for any
          damages arising out of your use of the site or any content on it.
        </p>

        <h2>{t("changes")}</h2>
        <p>
          We may update these terms from time to time. Changes apply once
          posted on this page.
        </p>

        <h2>{t("contact")}</h2>
        <p>
          Questions about these terms? Open an issue at{" "}
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
