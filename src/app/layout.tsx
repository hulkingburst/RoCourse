import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/providers/theme-provider";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
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
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
