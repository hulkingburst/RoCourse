"use server";

import { headers } from "next/headers";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  isRateLimited,
  pruneAttempts,
  recordAttempt,
  SIGNUP_MAX_ATTEMPTS,
} from "@/lib/auth-limiter";

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
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "unknown";
  const key = `signup:${ip}`;
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
  await prisma.user.create({
    data: { name, email, passwordHash },
  });

  return {};
}
