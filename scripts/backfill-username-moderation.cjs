// One-off maintenance script: renames users whose public name trips the new
// email/website moderation (added to src/lib/profanity.ts) to `guest-<6-8
// chars>`, rotates their URL handle to match, keeps the weekly leaderboard
// name in sync, and notifies each affected user with a pointer back to
// Settings so they can pick a new name. Idempotent: `guest-*` names never
// match the rules again, and the notification upserts by localKey.
//
//   node scripts/backfill-username-moderation.cjs           # dry-run report
//   node scripts/backfill-username-moderation.cjs --apply   # make the change

process.loadEnvFile(".env");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

// Mirrors src/lib/profanity.ts (email / website screening) so the script uses
// the same rules the app itself enforces.
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL_RE = /(?:^|[\s(])(?:www\.|https?:\/\/|ftp:\/\/)/i;
const PROMOTION_TLDS =
  "com|net|org|io|co|me|info|biz|dev|xyz|app|site|online|store|shop|club|gg|tv|ai|us|uk|link|top|work|fun|world|blog|space|cloud|pro|game|live|tech|page|team|media|news";
const PROMOTION_RE = new RegExp(
  `(^|[\\s(])[a-z0-9][a-z0-9-]*\\.(${PROMOTION_TLDS})(?![a-z0-9-])`,
  "i"
);

function tripped(name) {
  if (EMAIL_RE.test(name)) return "email";
  if (URL_RE.test(name) || PROMOTION_RE.test(name)) return "site";
  return null;
}

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
function guestName() {
  const len = 6 + Math.floor(Math.random() * 3);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `guest-${out}`;
}

// Mirrors src/lib/users.ts handle rules.
function slugifyHandle(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "learner";
}

function uniqueSuffix(attempt) {
  return `${attempt.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function uniqueFrom(base, taken) {
  if (!taken.has(base)) return base;
  for (let attempt = 1; attempt < 100; attempt++) {
    const candidate = `${base}-${uniqueSuffix(attempt)}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function bodyFor(name) {
  return (
    `Your username was changed automatically to ${name}. This is usually because ` +
    "moderation settings changed after your username was made (usernames can't look " +
    "like an email address or a website). You can change your username in Settings."
  );
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, handle: true },
  });

  const affected = users
    .map((u) => ({ ...u, reason: tripped(u.name) }))
    .filter((u) => u.reason !== null);

  console.log(`Total users: ${users.length}`);
  console.log(`Affected:    ${affected.length}`);
  for (const u of affected) {
    console.log(`  - [${u.reason}] "${u.name}"  (handle: ${u.handle ?? "none"}, id: ${u.id})`);
  }

  if (affected.length === 0) {
    console.log("Nothing to do.");
    await prisma.$disconnect();
    return;
  }
  if (!APPLY) {
    console.log("\nDry run only — no changes made. Re-run with --apply to proceed.");
    await prisma.$disconnect();
    return;
  }

  const usedNames = new Set(users.map((u) => u.name));
  const takenHandles = new Set(users.map((u) => u.handle).filter(Boolean));
  let renamed = 0;
  let rotated = 0;
  for (const u of affected) {
    let next = guestName();
    while (usedNames.has(next)) next = guestName();
    usedNames.add(next);

    // Rotate the URL handle too — it was slugified from the same offending
    // name (e.g. an email address), so it leaks the same detail the name did.
    const handle = uniqueFrom(slugifyHandle(next), takenHandles);
    takenHandles.add(handle);
    if (u.handle && u.handle !== handle) rotated += 1;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: u.id },
        // nameChangedAt cleared so the auto-rename doesn't lock the user into
        // the 7-day cooldown they never opted into.
        data: { name: next, nameChangedAt: null, handle },
      }),
      prisma.weeklyXp.updateMany({
        where: { userId: u.id },
        data: { name: next },
      }),
      prisma.notification.upsert({
        where: {
          userId_localKey: { userId: u.id, localKey: `moderation:username:${u.id}` },
        },
        create: {
          userId: u.id,
          localKey: `moderation:username:${u.id}`,
          type: "moderation",
          title: "Username moderated",
          body: bodyFor(next),
          link: "/settings",
        },
        update: {
          type: "moderation",
          title: "Username moderated",
          body: bodyFor(next),
          link: "/settings",
        },
      }),
    ]);
    console.log(`  renamed  "${u.name}" -> ${next}  (handle: ${u.handle ?? "none"} -> ${handle})`);
    renamed += 1;
  }
  console.log(`\nDone: ${renamed} user(s) renamed, ${rotated} handle(s) rotated.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});