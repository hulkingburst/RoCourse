import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
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
 * Auth.js (next-auth v5) configuration.
 *
 * Credentials-only, JWT sessions — no OAuth, no adapter tables. Sign-in
 * records and sessions live in the DB; everything else is JWT.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // Required for credentials sign-in on hosted platforms (Vercel). We only use
  // our own host and credentials (no OAuth redirect flows), so this is safe.
  trustHost: true,
  pages: {
    signIn: "/",
  },
  providers: [
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

        const valid = await compare(password, user.passwordHash);
        if (!valid) {
          await recordAttempt(key);
          await pruneAttempts();
          return null;
        }

        await clearAttempts(key);
        return { id: user.id, email: user.email, name: user.name, handle: user.handle };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      if (user && user.handle) token.handle = user.handle;

      // Back-fill for sessions created before handles existed. Only happens for
      // those users and until their next sign-in, so the cost is negligible.
      if (token.id && !token.handle) {
        const existing = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { handle: true },
        });
        if (existing?.handle) token.handle = existing.handle;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
        if (typeof token.handle === "string") {
          session.user.handle = token.handle;
        }
      }
      return session;
    },
  },
});
