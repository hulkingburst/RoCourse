import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SyncHost } from "@/components/auth/sync-host";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RoCourse — Learn Luau & Roblox for Free",
    template: "%s · RoCourse — Free",
  },
  description:
    "A free, interactive course for learning Luau and Roblox game development from absolute zero — through hands-on lessons, real game code, and a complete final project. No paywall, no sign-up.",
  keywords: ["Roblox", "Luau", "Lua", "Roblox Studio", "learn to code", "game development", "free course"],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The proxy (src/proxy.ts) stamps a fresh nonce onto every page view. It is
  // forwarded to next-themes so its inline theme script carries the same
  // nonce and passes the strict Content-Security-Policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <AuthProvider>
            {children}
            <SyncHost />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
