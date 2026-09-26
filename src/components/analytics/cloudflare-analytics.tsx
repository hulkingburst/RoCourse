"use client";

import * as React from "react";

/**
 * Cloudflare Web Analytics beacon. Rendered in place of Vercel Analytics when
 * NEXT_PUBLIC_ANALYTICS="cloudflare" is baked at build time. The token comes
 * from the Cloudflare dashboard (Web Analytics -> beacon snippet).
 */
export function CloudflareAnalytics() {
  React.useEffect(() => {
    const token = process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN;
    if (!token || document.querySelector('script[data-cf-beacon]')) return;
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.setAttribute(
      "data-cf-beacon",
      JSON.stringify({ token: token as string })
    );
    document.head.appendChild(script);
  }, []);
  return null;
}