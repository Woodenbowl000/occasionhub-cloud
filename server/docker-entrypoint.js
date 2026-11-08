/*
 * Container entrypoint for the OccasionHub API (application tier).
 *
 * 1. On AWS, loads credentials from AWS Secrets Manager at start-up using the
 *    EC2 instance role. Nothing secret is baked into the image, the launch
 *    template or the CI/CD pipeline.
 *      DB_SECRET_ARN  -> {username, password, host, port, dbname} -> DATABASE_URL
 *      APP_SECRET_ARN -> {JWT_SECRET, STRIPE_SECRET_KEY, ...}     -> process.env
 *    Locally (docker compose) DATABASE_URL etc. come from the environment.
 * 2. Applies pending Prisma migrations (safe on many instances at once:
 *    `prisma migrate deploy` takes a PostgreSQL advisory lock).
 * 3. Optionally seeds demo data (the seed script is idempotent).
 * 4. Starts the Express server.
 */
const path = require("path");
const { execFileSync } = require("child_process");

const log = (msg) => console.log(`[entrypoint] ${msg}`);

async function readSecret(arn) {
  const {
    SecretsManagerClient,
    GetSecretValueCommand,
  } = require("@aws-sdk/client-secrets-manager");
  const client = new SecretsManagerClient({});
  const out = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  return JSON.parse(out.SecretString);
}

async function loadSecrets() {
  if (process.env.DB_SECRET_ARN) {
    const db = await readSecret(process.env.DB_SECRET_ARN);
    const params = new URLSearchParams({
      // RDS enforces TLS (rds.force_ssl=1); traffic to the database is encrypted
      sslmode: "require",
      // Connections per app container; RDS db.t4g.micro allows ~80 in total
      connection_limit: process.env.DB_POOL_SIZE || "5",
      pool_timeout: "10",
    });
    const url =
      `postgresql://${encodeURIComponent(db.username)}:${encodeURIComponent(db.password)}` +
      `@${db.host}:${db.port}/${db.dbname}?${params}`;
    process.env.DATABASE_URL = url;
    process.env.DATABASE_URL_UNPOOLED = url;
    log(`database credentials loaded from Secrets Manager (host ${db.host})`);
  }
  if (process.env.APP_SECRET_ARN) {
    const secrets = await readSecret(process.env.APP_SECRET_ARN);
    for (const [key, value] of Object.entries(secrets)) {
      if (value !== "" && value !== null) process.env[key] = String(value);
    }
    log(`application secrets loaded: ${Object.keys(secrets).join(", ")}`);
  }
}

function run(script, args) {
  execFileSync(process.execPath, [script, ...args], {
    stdio: "inherit",
    env: process.env,
  });
}

async function main() {
  await loadSecrets();

  if (process.env.RUN_MIGRATIONS !== "false") {
    log("applying database migrations");
    run(path.join(__dirname, "node_modules/prisma/build/index.js"), [
      "migrate",
      "deploy",
    ]);
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    try {
      log("seeding demo data (idempotent)");
      run(path.join(__dirname, "dist-seed/seed.js"), []);
    } catch (err) {
      // Another instance may be seeding at the same moment; not fatal.
      log(`seed skipped: ${err.message}`);
    }
  }

  require("./dist/index.js");
}

main().catch((err) => {
  console.error("[entrypoint] start-up failed:", err);
  process.exit(1);
});
