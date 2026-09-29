const { execSync } = require("node:child_process");

// Accounts are optional — the site must keep deploying even when the database
// env vars aren't configured yet. Only run migrations when we have a DB to
// migrate, and never let a migrate failure take the site down.
if (process.env.DATABASE_URL) {
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit", shell: true });
  } catch (error) {
    console.error(
      "[vercel-build] prisma migrate deploy failed; continuing build so the site stays up."
    );
    console.error(error.message);
  }
}

// Rebuild the committed lesson snapshot first. The app reads the lesson files
// directly wherever a filesystem exists (so this changes nothing about what
// Vercel serves), but refreshing it here keeps the no-filesystem fallback that
// the Cloudflare build relies on from ever drifting away from the content.
execSync("npm run content:snapshot", { stdio: "inherit", shell: true });

execSync("npx next build", { stdio: "inherit", shell: true });
