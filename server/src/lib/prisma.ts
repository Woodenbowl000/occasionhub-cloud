import { PrismaClient } from "@prisma/client";

// One client per process. Serverless functions (Vercel) reuse warm instances,
// so caching on globalThis avoids opening a new connection pool per request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
