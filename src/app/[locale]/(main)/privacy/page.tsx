import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: { canonical: "/privacy" },
  };
}

const LAST_UPDATED = "August 8, 2026";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("lastUpdated", { date: LAST_UPDATED })}
      </p>

      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-relaxed">
        <p>
          RoCourse (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the
          site&rdquo;) is a free course for learning Luau and Roblox game
          development. This policy explains what data the site collects, why it
          collects it, and the choices you have.
        </p>

        <h2>{t("shortVersion")}</h2>
        <ul>
          <li>Guests can use the whole course with zero personal data. Progress stays in your browser.</li>
          <li>Accounts are optional and store only a name, an email, and a hashed password.</li>
          <li>Signed-in progress is synced to our servers so you can continue on another device.</li>
          <li>We use Vercel Analytics to count visits; it doesn&apos;t include your email or lesson content.</li>
          <li>Public profiles are opt-in — never automatic — and never show your email.</li>
        </ul>

        <h2>{t("whatWeCollect")}</h2>
        <h3>{t("accountData")}</h3>
        <p>
          When you create an account we collect your display name, email
          address, and a hashed password. The password is hashed with bcrypt;
          the plaintext password is never stored or logged.
        </p>
        <h3>{t("progressData")}</h3>
        <p>
          Lesson progress, streaks, quiz results, daily challenge completions,
          bookmarks, and recently viewed lessons are stored in your browser&apos;s
          localStorage. When you sign in, a copy is sent to our servers so it
          can be restored on another device. You can reset this data from your
          profile at any time.
        </p>
        <h3>{t("analytics")}</h3>
        <p>
          We use Vercel Analytics to understand aggregate traffic, such as page
          views, referrer, and device type. It does not include your account
          data, email, or progress.
        </p>
        <h3>{t("communityResources")}</h3>
        <p>
          If you submit a resource via the site, we receive the content you
          submit (code, a file archive, or a link) along with any credit name
          you provide.
        </p>

        <h2>{t("cookies")}</h2>
        <p>
          Signed-in users get a single session cookie from our authentication
          provider (Auth.js). It is required to stay signed in. We do not use
          third-party advertising or tracking cookies.
        </p>

        <h2>{t("publicProfiles")}</h2>
        <p>
          Nothing about you is public by default. If you choose to create a
          public handle, a page at <code>/u/&lt;handle&gt;</code> shows your
          display name and progress stats (lessons completed, streak, completed
          courses). Your email is never shown — it is masked even on your own
          profile.
        </p>

        <h2>{t("thirdParties")}</h2>
        <ul>
          <li>Vercel — hosting and Vercel Analytics.</li>
          <li>Vercel Blob — storage for submitted resource files.</li>
          <li>GitHub — the feedback and resource-review workflow (issues in a private repository).</li>
          <li>A hosted Postgres database (e.g. Vercel Postgres or Neon) — account and progress storage.</li>
        </ul>

        <h2>{t("yourChoices")}</h2>
        <ul>
          <li>
            <strong>Reset progress:</strong> you can clear your local and synced
            progress from your profile.
          </li>
          <li>
            <strong>Request deletion:</strong> contact us and we will remove
            your account and stored progress.
          </li>
          <li>
            <strong>Legal rights:</strong> depending on where you live (for
            example under the GDPR), you may have rights to access, correct,
            export, or delete your data. Contact us to exercise them.
          </li>
        </ul>

        <h2>{t("children")}</h2>
        <p>
          RoCourse is intended for people who are at least 13 years old.
          Creating an account requires confirming that you are 13 or older (or
          meet the minimum age that applies to you in your country). If you are
          under that age, please use the course as a guest and do not create an
          account. If we learn that an account belongs to a child below the
          applicable age, we will delete it.
        </p>

        <h2>{t("contact")}</h2>
        <p>
          Questions about this policy? Open an issue at{" "}
          <a
            href="https://github.com/hulkingburst/RoCourse"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/hulkingburst/RoCourse
          </a>
          , or use the feedback button anywhere on the site. We will respond to
          privacy requests and takedown notices there.
        </p>

        <p>
          We may update this policy from time to time. Changes are posted on
          this page with an updated &ldquo;Last updated&rdquo; date.
        </p>
      </div>
    </div>
  );
}
