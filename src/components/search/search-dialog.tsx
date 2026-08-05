"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchExperience } from "@/components/search/search-experience";
import { Button } from "@/components/ui/button";
import type { SearchEntry } from "@/lib/types";

export function SearchDialog({ entries }: { entries: SearchEntry[] }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden w-48 justify-start text-muted-foreground sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Search lessons…
        <kbd className="pointer-events-none ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
      <DialogContent className="top-[18%] max-w-xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Search lessons</DialogTitle>
          <DialogDescription className="sr-only">
            Search across every lesson in the course.
          </DialogDescription>
        </DialogHeader>
        <SearchExperience entries={entries} autoFocus />
      </DialogContent>
    </Dialog>
  );
}
