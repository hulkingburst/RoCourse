import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  clearAttempts,
  clientIp,
  isRateLimited,
  LOGIN_MAX_FAILURES,
  pruneAttempts,
  recordAttempt,
} from "@/lib/auth-limiter";

/**
 * Precomputed cost-12 bcrypt hash used to equalize response timing for unknown
 * emails. Without this, a missing account returns instantly while an existing
 * one waits ~300ms for the compare — a usable email-enumeration oracle.
 */
const DUMMY_HASH =
  "$2b$12$4ZfVaQj0KDbj2o2Cw1GPZOB9JD3SVEEeA0kegsd9fqdfVrC4KhWFC";

/**
 * Finds or creates the User row backing an OAuth sign-in. Auth.js runs without
 * a database adapter here (JWT sessions only), so the provider profile is not
 * persisted automatically — this links it to our `User` table by email.
 *
 * A verified provider email matching an existing credentials account adopts
 * that account (so Google sign-in "just works" for someone who already signed
 * up with email+password). Returns null when the provider gives no email.
 */
async function resolveOauthUser(profile: {
  email?: string | null;
  name?: string | null;
  image?: string | null;
}) {
  const email = profile.email?.trim().toLowerCase();
  if (!email) return null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const data = {
    email,
    name: profile.name?.trim().slice(0, 40) || email.split("@")[0],
    passwordHash: null,
    image: profile.image ?? null,
  };

  try {
    return await prisma.user.create({ data });
  } catch (error) {
    // Two simultaneous sign-ins for a brand-new email can race on the unique
    // constraint — treat the loser as an already-existing user.
    if ((error as { code?: string }).code === "P2002") {
      return prisma.user.findUnique({ where: { email } });
    }
    throw error;
  }
}

/**
 * OAuth providers are only enabled when their credentials are configured, so
 * local dev and deployments without them keep working (email+password only).
 * Create apps and register the callback URL `<site>/api/auth/callback/{provider}`
 * (e.g. https://yoursite.vercel.app/api/auth/callback/google).
 */
const oauthProviders = [
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? Google({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    : null,
  process.env.GITHUB_ID && process.env.GITHUB_SECRET
    ? GitHub({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    : null,
  process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? Discord({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      })
    : null,
].filter((provider): provider is NonNullable<typeof provider> => provider != null);

/**
 * Auth.js (next-auth v5) configuration.
 *
 * Email+password plus optional OAuth (Google, GitHub, Discord). JWT sessions,
 * no adapter tables — OAuth identities are resolved into `User` rows by email.
 * Sign-in rate limiting covers the credentials provider only.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Required for sign-in on hosted platforms (Vercel). We only ever sign in to
  // our own host via credentials or configured OAuth redirects, so this is safe.
  trustHost: true,
  pages: {
    signIn: "/",
  },
  providers: [
    ...oauthProviders,
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const normalized = email.trim().toLowerCase();
        const key = `${normalized}|${clientIp(request)}`;

        // Brute-force / credential-stuffing protection (per account + IP).
        if (await isRateLimited(key, LOGIN_MAX_FAILURES)) return null;

        const user = await prisma.user.findUnique({ where: { email: normalized } });

        if (!user) {
          // Equalize timing so the endpoint can't enumerate registered emails.
          await compare(password, DUMMY_HASH);
          await recordAttempt(key);
          await pruneAttempts();
          return null;
        }

        // OAuth-only accounts have no password — credentials sign-in must fail
        // for them (they authenticate through their provider instead).
        const valid = user.passwordHash && (await compare(password, user.passwordHash));
        if (!valid) {
          await recordAttempt(key);
          await pruneAttempts();
          return null;
        }

        await clearAttempts(key);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      // Credentials users are already validated by `authorize`. OAuth sign-ins
      // without an email can't be linked to a progress profile, so reject them.
      if (account?.type === "oauth") return Boolean(user.email);
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "credentials") {
          // `user.id` is already our DB id (returned by `authorize`).
          token.id = user.id;
        } else {
          // OAuth: `user.id` is the provider's id — resolve to our DB user.
          const dbUser = await resolveOauthUser(user);
          token.id = dbUser?.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
