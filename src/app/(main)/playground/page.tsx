import type { Metadata } from "next";
import { PlaygroundClient } from "@/components/playground/playground-client";

export const metadata: Metadata = {
  title: "Luau Playground — Run Luau Code Online",
  description:
    "Write and run Luau code in your browser. Experiment with Roblox scripting, functions, loops, tables and more — no Studio install needed.",
};

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <PlaygroundClient />
    </div>
  );
}
