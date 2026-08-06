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

execSync("npx next build", { stdio: "inherit", shell: true });
