"use server";

import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isRateLimited,
  pruneAttempts,
  recordAttempt,
  SIGNUP_MAX_ATTEMPTS,
  trustedIp,
} from "@/lib/auth-limiter";
import { generateUniqueHandle } from "@/lib/users";

export interface CreateAccountResult {
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a new account. Password is hashed server-side; the caller then signs
 * the user in with the credentials provider.
 */
export async function createAccount(
  _prevState: CreateAccountResult,
  formData: FormData
): Promise<CreateAccountResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  // Rate-limit sign-ups per IP before doing any bcrypt work, so the endpoint
  // can't be used to exhaust CPU with cost-12 hashes or to spam accounts.
  const headerList = await headers();
  const key = `signup:${trustedIp(headerList)}`;
  if (await isRateLimited(key, SIGNUP_MAX_ATTEMPTS)) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }
  await recordAttempt(key);
  await pruneAttempts();

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (name.length > 40) {
    return { error: "Name must be 40 characters or fewer." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await hash(password, 12);

  // Handle generation races under concurrency (two users, same name, same
  // handle). Retry on unique-constraint collisions and surface friendly
  // errors instead of a bare 500.
  for (let attempt = 0; attempt < 3; attempt++) {
    const handle = await generateUniqueHandle(name);
    try {
      await prisma.user.create({
        data: { name, email, passwordHash, handle },
      });
      return {};
    } catch (err) {
      const isDuplicate =
        err instanceof Error &&
        "code" in err &&
        (err as { code?: string }).code === "P2002";
      if (!isDuplicate) {
        return { error: "Something went wrong creating your account. Please try again." };
      }
      // If the email collided, the existence check above lost a race.
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return { error: "An account with this email already exists. Try signing in." };
      }
      // Otherwise the handle collided; loop and regenerate it.
    }
  }
  return { error: "Could not create an account. Please try again." };
}
