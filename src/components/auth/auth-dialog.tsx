"use client";

import { getProviders, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { createAccount } from "@/lib/auth-actions";
import { useAuthUiStore } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";
import { DiscordIcon, GitHubIcon, GoogleIcon } from "@/components/auth/provider-icons";
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

const OAUTH_PROVIDER_IDS = ["google", "github", "discord"] as const;
const OAUTH_ICONS: Record<(typeof OAUTH_PROVIDER_IDS)[number], React.ComponentType<{ className?: string }>> = {
  google: GoogleIcon,
  github: GitHubIcon,
  discord: DiscordIcon,
};

export function AuthDialog() {
  const { open, mode, closeDialog } = useAuthUiStore();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [oauthButtons, setOauthButtons] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void getProviders().then((providers) => {
      if (cancelled || !providers) return;
      setOauthButtons(
        OAUTH_PROVIDER_IDS.filter((id) => providers[id]).map((id) => ({
          id,
          name: providers[id].name,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      setError("Invalid email or password.");
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
      setError("Account created, but sign-in failed. Please sign in.");
    } else {
      closeDialog();
      router.refresh();
    }
    setSubmitting(false);
  };

  const isSignup = mode === "signup";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignup ? "Create account" : "Sign in"}</DialogTitle>
          <DialogDescription>
            Accounts are optional. They only let you keep your progress in sync
            across devices — everything else works the same with or without one.
          </DialogDescription>
        </DialogHeader>

        {oauthButtons.length > 0 ? (
          <div className="space-y-2">
            {oauthButtons.map((button) => {
              const Icon = OAUTH_ICONS[button.id as (typeof OAUTH_PROVIDER_IDS)[number]];
              return (
                <Button
                  key={button.id}
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => signIn(button.id)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  Continue with {button.name}
                </Button>
              );
            })}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or continue with email
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}

        {isSignup ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required maxLength={40} placeholder="Ada" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" name="email" type="email" required placeholder="ada@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input id="signup-password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirm password</Label>
              <Input id="signup-confirm" name="confirm" type="password" required placeholder="Repeat your password" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input id="signin-email" name="email" type="email" required placeholder="ada@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">Password</Label>
              <Input id="signin-password" name="password" type="password" required placeholder="Your password" />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {isSignup ? "Already have an account? " : "New to RoCourse? "}
          <button
            type="button"
            onClick={() => useAuthUiStore.setState({ mode: isSignup ? "signin" : "signup" })}
            className="font-medium text-primary underline underline-offset-4"
          >
            {isSignup ? "Sign in" : "Create one"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
