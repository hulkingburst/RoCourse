import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubmitForm } from "@/components/resources/submit-form";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Submit a Roblox Resource",
  description:
    "Share a script, asset pack, UI module or model for the RoCourse community. The course author reviews every submission before it's published.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const t = await getTranslations("resources");
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">
        {t("submitPageTitle")}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {t.rich("submitPageIntro", {
          link: (chunks) => (
            <Link
              href="/resources"
              className="text-primary underline-offset-4 hover:underline"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
      <div className="mt-8">
        <SubmitForm />
      </div>
    </div>
  );
}
