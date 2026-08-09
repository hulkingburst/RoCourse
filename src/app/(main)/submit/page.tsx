import type { Metadata } from "next";
import { SubmitForm } from "@/components/resources/submit-form";

export const metadata: Metadata = {
  title: "Submit a Roblox Resource",
  description:
    "Share a script, asset pack, UI module or model for the RoCourse community. The course author reviews every submission before it's published.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/submit" },
};

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Submit a resource</h1>
      <p className="mt-2 text-muted-foreground">
        Made something worth sharing? Submit it and it goes to the course
        author for review. Accepted resources appear on the{" "}
        <a href="/resources" className="text-primary underline-offset-4 hover:underline">
          Resources
        </a>{" "}
        page.
      </p>
      <div className="mt-8">
        <SubmitForm />
      </div>
    </div>
  );
}
