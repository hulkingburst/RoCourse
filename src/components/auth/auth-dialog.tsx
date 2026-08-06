"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
