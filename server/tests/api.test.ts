/**
 * API tests run by the CI pipeline (and locally with `npm test`).
 *
 * - Liveness tests need no database.
 * - Integration tests run when DATABASE_URL points at a migrated + seeded
 *   PostgreSQL/PostGIS database (the pipeline starts one as a service container).
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

process.env.JWT_SECRET ??= "test-only-secret";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require("../src/app").default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prisma = require("../src/lib/prisma").default;

let server: Server;
let base = "";

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.close();
  await prisma.$disconnect();
});

const get = (path: string) => fetch(`${base}${path}`);
// Response bodies are untyped JSON in these tests
const json = (res: Response): Promise<any> => res.json();

describe("liveness", () => {
  test("GET /health returns ok with instance and version", async () => {
    const res = await get("/health");
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.equal(body.status, "ok");
    assert.ok(body.instance);
    assert.ok(body.version);
  });

  test("responses name the serving instance and hide the framework", async () => {
    const res = await get("/health");
    assert.ok(res.headers.get("x-app-instance"));
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("GET / reports the API is running", async () => {
    const res = await get("/");
    assert.equal(res.status, 200);
    assert.match((await json(res)).message, /running/i);
  });
});

const withDb = { skip: !process.env.DATABASE_URL && "DATABASE_URL not set" };

describe("integration (database)", withDb, () => {
  test("GET /ready reports the database is reachable", async () => {
    const res = await get("/ready");
    assert.equal(res.status, 200);
    assert.equal((await json(res)).database, "ok");
  });

  test("GET /venues returns approved venues with coordinates", async () => {
    const res = await get("/venues?limit=5");
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.ok(body.venues.length > 0, "seed data should provide venues");
    assert.ok(body.venues.length <= 5);
    for (const v of body.venues) {
      assert.equal(v.isApproved, true);
      assert.equal(typeof v.latitude, "number");
      assert.equal(typeof v.longitude, "number");
    }
  });

  test("venue list responses are gzip-compressed", async () => {
    const res = await fetch(`${base}/venues?limit=20`, {
      headers: { "Accept-Encoding": "gzip" },
    });
    assert.equal(res.headers.get("content-encoding"), "gzip");
  });

  test("page size is capped and unknown sort fields are ignored", async () => {
    const res = await get("/venues?limit=5000&sortBy=password");
    assert.equal(res.status, 200);
    assert.equal((await json(res)).pagination.limit, 100);
  });

  test("distance sort orders venues nearest first", async () => {
    const res = await get("/venues?userLat=33.7&userLon=73.0&sortBy=distance&sortOrder=asc");
    const d = (await json(res)).venues.map((v: any) => v.distance);
    assert.deepEqual(d, [...d].sort((a: number, b: number) => a - b));
  });

  test("city search is case-insensitive", async () => {
    const lower = await json(await get("/venues?city=islamabad"));
    const upper = await json(await get("/venues?city=ISLAMABAD"));
    assert.equal(lower.pagination.total, upper.pagination.total);
  });

  test("seeded admin can sign in and receives a JWT", async () => {
    const res = await fetch(`${base}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@occasionhub.com", password: "admin123" }),
    });
    assert.equal(res.status, 200);
    const body = await json(res);
    assert.match(body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test("wrong password is rejected", async () => {
    const res = await fetch(`${base}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@occasionhub.com", password: "wrong" }),
    });
    assert.ok(res.status === 400 || res.status === 401);
  });
});
