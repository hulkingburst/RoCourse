import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { getPublicUserSummaries } from "@/lib/users";
import { UsersClient } from "@/components/users/users-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Luau Learners Directory",
  description: "Find other people learning Luau on RoCourse.",
  alternates: { canonical: "/users" },
};

export default async function UsersPage() {
  const users = await getPublicUserSummaries();
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Learners</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Public profiles of people learning Luau here. Tap one to see their
          progress, streaks, and completed courses.
        </p>
        <Link
          href="/showcase"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          <Trophy className="h-3.5 w-3.5" />
          See who finished the course
        </Link>
      </div>
      <UsersClient users={users} />
    </div>
  );
}
