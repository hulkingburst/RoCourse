import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/users";
import { PublicProfileView } from "@/components/profile/public-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) {
    return { title: "Learner not found" };
  }
  return {
    title: `${profile.name}'s progress`,
    description: `${profile.name} has completed ${profile.stats.lessonsCompleted} of ${profile.totalLessons} lessons on RoCourse.`,
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
