import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getCloudState } from "@/lib/sync-api";
import { CertificateClient } from "@/components/certificate/certificate-client";
import { CertificateEmptyState } from "@/components/certificate/certificate-empty";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RoCourse Certificate of Completion",
  description:
    "Download your RoCourse certificate of completion as a PNG or PDF.",
};

export default async function CertificatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { course } = await searchParams;
  const initialCourseId = typeof course === "string" ? course : null;

  const session = await auth();
  if (!session?.user?.id) {
    return <CertificateEmptyState signedIn={false} />;
  }

  const state = await getCloudState(session.user.id);
  const completions = state.completions ?? [];
  if (completions.length === 0) {
    return <CertificateEmptyState signedIn />;
  }

  const name =
    session.user.name ??
    (session.user.email ? session.user.email.split("@")[0] : null) ??
    "Learner";

  return (
    <CertificateClient
      name={name}
      completions={completions.map((completion) => ({
        courseId: completion.courseId,
        title: completion.title,
        completedAt: completion.completedAt,
      }))}
      initialCourseId={initialCourseId}
    />
  );
}
