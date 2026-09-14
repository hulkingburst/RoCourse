import type { Metadata } from "next";
import { SettingsClient } from "@/components/settings/settings-client";
import { auth } from "@/lib/auth";
import { getUsernameChangeInfo } from "@/lib/account";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your RoCourse preferences.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/settings" },
};

export default async function SettingsPage() {
  const session = await auth();
  const account = session?.user?.id
    ? await getUsernameChangeInfo(session.user.id)
    : null;
  return <SettingsClient account={account} />;
}