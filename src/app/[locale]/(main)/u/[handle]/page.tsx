import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getPublicProfile } from "@/lib/users";
import { PublicProfileView } from "@/components/profile/public-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>;
}): Promise<Metadata> {
  const { handle, locale } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) {
    const t = await getTranslations({ locale, namespace: "userProfile" });
    return { title: t("notFoundTitle") };
  }
  const t = await getTranslations({ locale, namespace: "userProfile" });
  return {
    title: t("progressTitle", { name: profile.name }),
    description: t("progressDescription", {
      name: profile.name,
      completed: profile.stats.lessonsCompleted,
      total: profile.totalLessons,
    }),
    alternates: { canonical: `/u/${handle}` },
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();

  return <PublicProfileView profile={profile} />;
}
