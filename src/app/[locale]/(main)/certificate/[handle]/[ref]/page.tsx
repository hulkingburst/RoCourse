import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getShareableCertificate } from "@/lib/certificates";
import { courseTitleKey } from "@/lib/course-titles";
import { CertificateShared } from "@/components/certificate/certificate-shared";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; handle: string; ref: string }>;
}): Promise<Metadata> {
  const { locale, handle, ref } = await params;
  const t = await getTranslations({ locale, namespace: "certificateShare" });
  const certificate = await getShareableCertificate(handle, ref);
  if (!certificate) {
    return { title: t("notFoundTitle") };
  }

  const course = await getTranslations({ locale, namespace: "course" });
  const title =
    certificate.scope.kind === "course"
      ? course(courseTitleKey(certificate.scope.courseId))
      : certificate.title ?? "";

  return {
    title: t("metaTitle", { title }),
    description: t("metaDescription", { name: certificate.name, title }),
    alternates: { canonical: `/certificate/${handle}/${ref}` },
  };
}

export default async function SharedCertificatePage({
  params,
}: {
  params: Promise<{ handle: string; ref: string }>;
}) {
  const { handle, ref } = await params;
  const certificate = await getShareableCertificate(handle, ref);
  if (!certificate) notFound();

  const course = await getTranslations("course");
  const title =
    certificate.scope.kind === "course"
      ? course(courseTitleKey(certificate.scope.courseId))
      : certificate.title ?? "";

  return (
    <CertificateShared
      handle={handle}
      refCode={ref}
      name={certificate.name}
      title={title}
      completedAt={certificate.completedAt}
      isSection={certificate.scope.kind === "section"}
      sectionId={
        certificate.scope.kind === "section"
          ? certificate.scope.sectionId
          : undefined
      }
    />
  );
}