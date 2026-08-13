import type { Metadata } from "next";
import { DrillClient } from "@/components/quiz/drill-client";

export const metadata: Metadata = {
  title: "60-Second Luau Drill — Beat the Clock",
  description:
    "A timed sprint through hard Luau questions. Answer as many as you can in 60 seconds — your best score is saved to your profile.",
  alternates: { canonical: "/quiz/drills" },
};

export default function DrillsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <DrillClient />
    </div>
  );
}
