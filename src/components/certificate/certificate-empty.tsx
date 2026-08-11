"use client";

import { Link } from "@/i18n/navigation";
import { Award, UserCircle2 } from "lucide-react";
import { useAuthUiStore } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";

/**
 * Shown when a certificate can't be produced yet: either the learner isn't
 * signed in or they haven't finished a course.
 */
export function CertificateEmptyState({ signedIn }: { signedIn: boolean }) {
  const openDialog = useAuthUiStore((state) => state.openDialog);

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Award className="h-7 w-7 text-muted-foreground" />
      </div>
      {signedIn ? (
        <>
          <h1 className="text-2xl font-bold">No certificate yet</h1>
          <p className="mt-3 text-muted-foreground">
            You earn a certificate when you complete the final project. Head
            back to the course and finish it off — you&apos;re close.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/lessons/final-project">Go to the final project</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/profile">View profile</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <UserCircle2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Sign in to view certificates</h1>
          <p className="mt-3 text-muted-foreground">
            Certificates are linked to your account. Sign in to see and
            download the ones you&apos;ve earned.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => openDialog("signin")}>Sign in</Button>
            <Button variant="outline" onClick={() => openDialog("signup")}>
              Create account
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
