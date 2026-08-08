import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAcceptedResources } from "@/lib/resources";
import { ResourcesCatalog } from "@/components/resources/resources-catalog";
import { Button } from "@/components/ui/button";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Free Roblox Scripts, Assets & Tools",
  description:
    "Hand-picked community resources for Roblox development: scripts, asset packs, UI modules and more. Every item is reviewed before it's listed.",
};

export default async function ResourcesPage() {
  const resources = await getAcceptedResources();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Hand-picked community assets for Roblox development. Every item here
            was reviewed by the course author before being published.
          </p>
        </div>
        <Button asChild>
          <Link href="/submit">
            <Plus className="h-4 w-4" />
            Submit a resource
          </Link>
        </Button>
      </div>
      <ResourcesCatalog resources={resources} />
    </div>
  );
}
