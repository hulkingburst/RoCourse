import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your RoCourse preferences.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/settings" },
};

export default function SettingsPage() {
  return <SettingsClient />;
}
