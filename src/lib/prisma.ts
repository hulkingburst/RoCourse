import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { neonDb } from "@/lib/db/neon";

// Runtime database layer selection. Prisma's query engine (binary or WASM)
// cannot execute inside the Cloudflare Workers runtime, so the Cloudflare
// build talks to the same Neon database through a raw @neondatabase/serverless
// SQL layer instead. Both branches are typed as PrismaClient here so every
// call site keeps compiling against the Prisma types; the neon layer implements
// the runtime subset of the calls this app actually uses.
const isCloudflare = process.env.NEXT_PUBLIC_ANALYTICS === "cloudflare";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

// Driver adapter: talks to Postgres through a driver instead of the native
// query engine binary, keeping serverless functions small (the engine no
// longer ships in every function that touches the database).
//
// PRISMA_ADAPTER selects the driver:
//   - "pg" (default): @prisma/adapter-pg over the `pg` TCP client. Used on
//     Vercel today.
//   - "neon": @prisma/adapter-neon over the Neon serverless HTTP driver
//     (pure fetch, no TCP/WebSocket sockets). Both connect to the same Neon
//     database.
function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or DATABASE_URL_UNPOOLED is required to query the database."
    );
  }

  const adapter =
    process.env.PRISMA_ADAPTER === "neon"
      ? new PrismaNeonHTTP(connectionString, {
          fullResults: true,
          arrayMode: false,
        })
      : new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Prisma client singleton. Reusing one client across hot reloads in dev
 * avoids exhausting the database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Builds the client on first use instead of at import time.
 *
 * Next evaluates this module while collecting page data during a build (the
 * API routes import it), so a missing DATABASE_URL raised at module scope
 * failed the whole build - including on hosts that have no database
 * configured, which scripts/vercel-build.js promises can still deploy. The
 * guard now fires on the first query that needs a client. Members are read
 * from the real client and called bound to it, so `this` is never the proxy.
 */
function lazyPrismaClient(): PrismaClient {
  let client: PrismaClient | null = null;
  return new Proxy({} as PrismaClient, {
    get(_target, property) {
      const real = client ?? (client = createPrismaClient());
      const value = Reflect.get(real, property);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const prisma: PrismaClient = isCloudflare
  ? (neonDb as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? lazyPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
