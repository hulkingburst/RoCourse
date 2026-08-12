import { NextResponse } from "next/server";
import { trustedIp } from "@/lib/auth-limiter";
import { isRateLimited, pruneRateLimits, recordRateLimit } from "@/lib/rate-limit";
import { ensureResourceLabels } from "@/lib/resources";
import {
  CODE_LANGS,
  MAX_AUTHOR,
  MAX_CODE,
  MAX_DESCRIPTION,
  MAX_RESOURCE_NAME,
  MAX_URL,
  RESOURCE_KINDS,
  type ResourceKind,
} from "@/lib/resources-shared";

export const runtime = "nodejs";
export const maxDuration = 15;

const LIMIT_PER_IP = 5;
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const limitKey = (ip: string) => `resource-submit:${ip}`;

// Only accept blobs that came from this project's Vercel Blob store.
const BLOB_HOST_RE = /(^|\.)public\.blob\.vercel-storage\.com$/;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const cleanLine = (value: unknown): string => clean(value).replace(/[\r\n]+/g, " ");

export async function POST(request: Request) {
  const ip = trustedIp(request.headers);

  // DB-backed rate limit (shared across instances) so the review queue stays
  // usable.
  if (await isRateLimited(limitKey(ip), LIMIT_PER_IP, LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const token = process.env.FEEDBACK_GITHUB_TOKEN;
  const repo = process.env.RESOURCES_GITHUB_REPO || "hulkingburst/rocourse-feedback";
  if (!token) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const fields = body as {
    name?: unknown;
    kind?: unknown;
    description?: unknown;
    author?: unknown;
    rights?: unknown;
    fileUrl?: unknown;
    code?: unknown;
    codeLang?: unknown;
    url?: unknown;
  };

  const name = cleanLine(fields.name);
  const kind = clean(fields.kind) as ResourceKind;
  const description = clean(fields.description);
  const author = cleanLine(fields.author);
  const fileUrl = clean(fields.fileUrl);
  const url = clean(fields.url);
  const code = fields.code === undefined ? "" : clean(fields.code);
  const codeLang = clean(fields.codeLang) || "luau";

  const kindOk = RESOURCE_KINDS.some((k) => k.value === kind);
  const langOk = (CODE_LANGS as readonly string[]).includes(codeLang);

  if (!kindOk) return NextResponse.json({ ok: false }, { status: 400 });
  if (name.length === 0 || name.length > MAX_RESOURCE_NAME) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (description.length === 0 || description.length > MAX_DESCRIPTION) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (author.length > MAX_AUTHOR) return NextResponse.json({ ok: false }, { status: 400 });
  if (fields.rights !== true) return NextResponse.json({ ok: false }, { status: 400 });

  const hasFile = fileUrl.length > 0;
  const hasCode = code.length > 0;
  const hasUrl = url.length > 0;
  const contentCount = (hasFile ? 1 : 0) + (hasCode ? 1 : 0) + (hasUrl ? 1 : 0);
  if (contentCount !== 1) {
    // Exactly one of file / code / website is required.
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!langOk) return NextResponse.json({ ok: false }, { status: 400 });

  if (hasFile) {
    let hostname: string;
    try {
      hostname = new URL(fileUrl).hostname;
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!BLOB_HOST_RE.test(hostname)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
  } else if (hasUrl) {
    if (url.length > MAX_URL) return NextResponse.json({ ok: false }, { status: 400 });
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (protocol !== "http:" && protocol !== "https:") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
  } else if (code.length > MAX_CODE) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const lines: string[] = [];
  lines.push(`<!-- RC:TYPE:${kind} -->`);
  if (author) lines.push(`<!-- RC:AUTHOR:${author} -->`);
  lines.push("<!-- RC:DESC_START -->", description, "<!-- RC:DESC_END -->");
  if (hasFile) {
    lines.push(`<!-- RC:FILE:${fileUrl} -->`);
  } else if (hasUrl) {
    lines.push(`<!-- RC:URL:${url} -->`);
  } else {
    lines.push(`<!-- RC:CODE:${codeLang} -->`, "<!-- RC:CODE_START -->", code, "<!-- RC:CODE_END -->");
  }
  lines.push("", `_Submitted ${new Date().toUTCString()} via the site. Rights confirmed._`);

  const labelsReady = await ensureResourceLabels();
  if (!labelsReady) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[Resource] ${name}`,
      body: lines.join("\n"),
      labels: ["resource", "needs-review"],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  await recordRateLimit(limitKey(ip));
  await pruneRateLimits();
  return NextResponse.json({ ok: true });
}
