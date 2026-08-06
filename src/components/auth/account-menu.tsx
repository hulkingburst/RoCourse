"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserCircle2, LogOut, Loader2 } from "lucide-react";
import * as React from "react";

import { useAuthUiStore } from "@/lib/auth-ui";
import { flushSync } from "@/lib/sync";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const { data: session, status } = useSession();
  const { openDialog } = useAuthUiStore();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await flushSync();
    } catch {
      // Sign out should still proceed even if the final sync fails.
    }
    await signOut({ redirect: false });
    router.push("/");
  };

  if (status === "loading") {
    return (
      <div className="h-9 w-16 animate-pulse rounded-md bg-muted" aria-hidden />
    );
  }

  if (session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5" disabled={signingOut}>
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCircle2 className="h-4 w-4" />
            )}
            <span className="max-w-[120px] truncate">
              {session.user.name || "Account"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">
            {session.user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => router.push("/profile")}>
            <UserCircle2 className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={() => openDialog("signin")}>
        Sign in
      </Button>
      <Button size="sm" onClick={() => openDialog("signup")}>
        Create account
      </Button>
    </div>
  );
}
