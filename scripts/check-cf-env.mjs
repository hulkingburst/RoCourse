// Fails a Cloudflare build started without NEXT_PUBLIC_ANALYTICS=cloudflare.
//
// The variable is a build-time switch, not a runtime one: Next inlines it into
// the bundles, where it picks the analytics beacon, the relaxed CSP, and
// `images.unoptimized` — and, in src/lib/prisma.ts, which database client to
// export. Only the Neon SQL branch can run on workerd (Prisma's engine cannot),
// so a Cloudflare build without the variable produces a Worker that deploys
// fine and then fails every database-backed route. Fail here instead.
if (process.env.NEXT_PUBLIC_ANALYTICS !== "cloudflare") {
  console.error(
    [
      "NEXT_PUBLIC_ANALYTICS=cloudflare is required to build for Cloudflare.",
      "",
      "  Local:          NEXT_PUBLIC_ANALYTICS=cloudflare npm run cf-build",
      "  Workers Builds: add it as a build variable (Settings > Build).",
      "",
    ].join("\n")
  );
  process.exit(1);
}
