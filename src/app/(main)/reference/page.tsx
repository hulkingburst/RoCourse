import type { Metadata } from "next";
import { REFERENCE_CATEGORIES, referenceEntries } from "@/lib/reference";
import { ReferenceClient } from "@/components/reference/reference-client";

export const metadata: Metadata = {
  title: "Luau Cheat Sheet & Roblox Reference",
  description:
    "A searchable Luau cheat sheet: syntax, functions, loops, tables, and Roblox scripting patterns.",
};

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Luau reference</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          A searchable cheat sheet of Luau syntax and common patterns. Each card
          links to the lesson that teaches the idea in full.
        </p>
      </div>
      <ReferenceClient
        entries={referenceEntries}
        categories={REFERENCE_CATEGORIES}
      />
    </div>
  );
}
