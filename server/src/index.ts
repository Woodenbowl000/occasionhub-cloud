import app from "./app";
import prisma from "./lib/prisma";

/* SERVER (local / long-running hosts). On Vercel, api/index.ts exports the app instead. */
const port = Number(process.env.PORT) || 3002;
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

// Keep idle connections open longer than the load balancer's 60 s idle
// timeout, so the ALB never reuses a socket Node has already closed (502s).
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Graceful shutdown: during a rolling deploy the instance is deregistered
// from the load balancer, then Docker sends SIGTERM. Finish in-flight
// requests before exiting.
const shutdown = (signal: string) => {
  console.log(`${signal} received, closing server`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
