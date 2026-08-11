"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { createAccount } from "@/lib/auth-actions";
import { useAuthUiStore } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function AuthDialog() {
  const { open, mode, closeDialog } = useAuthUiStore();
  const router = useRouter();
  const t = useTranslations("auth");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) reset();
    else closeDialog();
  };

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(t("invalidCredentials"));
      setSubmitting(false);
    } else {
      closeDialog();
      router.refresh();
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await createAccount({}, formData);
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (signInResult?.error) {
      setError(t("signInFailed"));
    } else {
      closeDialog();
      router.refresh();
    }
    setSubmitting(false);
  };

  const isSignup = mode === "signup";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignup ? t("createAccount") : t("signIn")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {isSignup ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" name="name" required maxLength={40} placeholder={t("namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">{t("email")}</Label>
              <Input id="signup-email" name="email" type="email" required placeholder={t("emailPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">{t("password")}</Label>
              <Input id="signup-password" name="password" type="password" required minLength={8} placeholder={t("passwordPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">{t("confirmPassword")}</Label>
              <Input id="signup-confirm" name="confirm" type="password" required placeholder={t("confirmPasswordPlaceholder")} />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4" />
              <span>
                {t.rich("agreeText", {
                  terms: (chunks) => (
                    <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                      {chunks}
                    </Link>
                  ),
                  privacy: (chunks) => (
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? t("creating") : t("createAccount")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">{t("email")}</Label>
              <Input id="signin-email" name="email" type="email" required placeholder={t("emailPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">{t("password")}</Label>
              <Input id="signin-password" name="password" type="password" required placeholder={t("passwordPlaceholderShort")} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isSignup ? t("alreadyHaveAccount") : t("newHere")}
          <button
            type="button"
            onClick={() => useAuthUiStore.setState({ mode: isSignup ? "signin" : "signup" })}
            className="font-medium text-primary underline underline-offset-4"
          >
            {isSignup ? t("signIn") : t("createOne")}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
