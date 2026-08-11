"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import Fuse from "fuse.js";
import { BookOpen, Flame, Search, SearchX, Trophy, Users } from "lucide-react";
import type { PublicUserSummary } from "@/lib/users";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function UsersClient({ users }: { users: PublicUserSummary[] }) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query), 120);
    return () => clearTimeout(timeout);
  }, [query]);

  const fuse = React.useMemo(
    () =>
      new Fuse(users, {
        keys: [
          { name: "name", weight: 0.6 },
          { name: "handle", weight: 0.4 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        includeScore: true,
        shouldSort: true,
      }),
    [users]
  );

  const results = React.useMemo(() => {
    const term = debounced.trim();
    if (!term) {
      return [...users].sort(
        (a, b) => b.lessonsCompleted - a.lessonsCompleted
      );
    }
    return fuse.search(term).map((result) => result.item);
  }, [debounced, fuse, users]);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Users className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No public learners yet — be the first to share your progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search learners by name or handle…"
          className="pl-9"
        />
      </div>

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((user) => (
            <UserRow key={user.handle} user={user} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No learners match “{query}”.
          </p>
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: PublicUserSummary }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link
      href={`/u/${user.handle}`}
      className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{user.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          @{user.handle}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {user.lessonsCompleted}
        </span>
        <span
          className={cn(
            "flex items-center gap-1",
            user.streak > 0 && "text-orange-500"
          )}
        >
          <Flame className="h-3.5 w-3.5" />
          {user.streak}
        </span>
        <span className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5" />
          {user.coursesCompleted}
        </span>
      </span>
    </Link>
  );
}
