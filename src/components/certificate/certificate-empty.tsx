"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Award, UserCircle2 } from "lucide-react";
import { useAuthUiStore } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";

/**
 * Shown when a certificate can't be produced yet: either the learner isn't
 * signed in or they haven't finished a course.
 */
export function CertificateEmptyState({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("certificate");
  const auth = useTranslations("auth");
  const openDialog = useAuthUiStore((state) => state.openDialog);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Award className="h-7 w-7 text-muted-foreground" />
      </div>
      {signedIn ? (
        <>
          <h1 className="text-2xl font-bold">{t("emptyTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/lessons/final-project">{t("goToFinalProject")}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/profile">{t("viewProfile")}</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <UserCircle2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{t("signInTitle")}</h1>
          <p className="mt-3 text-muted-foreground">{t("signInBody")}</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => openDialog("signin")}>{auth("signIn")}</Button>
            <Button variant="outline" onClick={() => openDialog("signup")}>
              {auth("createAccount")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
