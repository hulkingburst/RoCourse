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

if (!isCloudflare && !connectionString) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
}

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
  const adapter =
    process.env.PRISMA_ADAPTER === "neon"
      ? new PrismaNeonHTTP(connectionString!, {
          fullResults: true,
          arrayMode: false,
        })
      : new PrismaPg({ connectionString: connectionString! });

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

export const prisma: PrismaClient = isCloudflare
  ? (neonDb as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
