import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import os from "os";
import prisma from "./lib/prisma";
import { serveVenuePhoto, usingS3 } from "./utils/storage";

import authRoutes from "./routes/authRoutes";
import venueRoutes from "./routes/venueRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import favoriteRoutes from "./routes/favoriteRoutes";
import vendorApplicationRoutes from "./routes/vendorApplicationRoutes";
import vendorRoutes from "./routes/vendorRoutes";
import adminRoutes from "./routes/adminRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();

// Number of proxies in front of the API, so req.ip / req.protocol are right.
// Vercel: 1. AWS: public ALB -> Nginx -> internal ALB = 3 (set TRUST_PROXY=3).
const trustProxy = Number(process.env.TRUST_PROXY ?? 1);
app.set("trust proxy", Number.isFinite(trustProxy) ? trustProxy : 1);
app.disable("x-powered-by");

// On AWS the container hostname is the EC2 instance ID: every response says
// which application instance served it (shows load balancing at work).
const INSTANCE = os.hostname();
const VERSION = process.env.APP_VERSION || "dev";
app.use((_req, res, next) => {
  res.setHeader("X-App-Instance", INSTANCE);
  next();
});

// Health endpoints come first: no logging noise, no body parsing.
// Liveness (used by the load balancer): the process is up.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", instance: INSTANCE, version: VERSION });
});
// Readiness: the database is reachable too.
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", database: "ok" });
  } catch {
    res.status(503).json({ status: "not-ready", database: "unreachable" });
  }
});

// gzip JSON responses (venue lists are large and highly compressible)
app.use(compression());
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "tiny" : "common"));
app.use(bodyParser.urlencoded({ extended: false }));

// CLIENT_URL may hold several comma-separated origins, e.g.
// "https://occasionhub.vercel.app,https://www.occasionhub.com"
const allowedOrigins = [
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean),
  "http://localhost:3000",
  "http://localhost:3001",
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Venue photos: from the private S3 bucket on AWS, from disk in local dev
if (usingS3()) {
  app.get("/uploads/venues/:name", serveVenuePhoto);
} else {
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
}

app.get("/", (req, res) => {
  res.json({ message: "OccasionHub API is running" });
});

app.use("/auth", authRoutes);
app.use("/venues", venueRoutes);
app.use("/bookings", bookingRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/vendor-applications", vendorApplicationRoutes);
app.use("/vendor", vendorRoutes);
app.use("/admin", adminRoutes);

export default app;
