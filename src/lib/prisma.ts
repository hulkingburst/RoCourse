import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

// Driver adapter: talks to Postgres through a driver instead of the native
// query engine binary, keeping serverless functions small (the engine no
// longer ships in every function that touches the database).
//
// PRISMA_ADAPTER selects the driver:
//   - "pg" (default): @prisma/adapter-pg over the `pg` TCP client. Used on
//     Vercel today.
//   - "neon": @prisma/adapter-neon over the Neon serverless HTTP driver
//     (pure fetch, no TCP/WebSocket sockets, works on Cloudflare Pages free
//     tier too). Both connect to the same Neon database.
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED is required");
}

const adapter =
  process.env.PRISMA_ADAPTER === "neon"
    ? new PrismaNeonHTTP(connectionString, {
        fullResults: true,
        arrayMode: false,
      })
    : new PrismaPg({ connectionString });

/**
 * Prisma client singleton. Reusing one client across hot reloads in dev
 * avoids exhausting the database connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
