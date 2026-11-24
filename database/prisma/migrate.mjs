import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export function buildDatabaseUrl(secretString, hostOverride) {
  let secret;
  try {
    secret = JSON.parse(secretString);
  } catch {
    throw new Error("DATABASE_SECRET_INVALID_JSON");
  }

  const host = hostOverride || secret.host;
  const { username, password } = secret;
  const port = secret.port ?? 5432;
  const database = secret.dbname ?? process.env.DB_NAME ?? "task_platform";
  if (![host, username, password, database].every(value => typeof value === "string" && value.length > 0)) {
    throw new Error("DATABASE_SECRET_MISSING_REQUIRED_FIELDS");
  }

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?sslmode=require`;
}

export async function resolveDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (!env.DATABASE_SECRET_ARN) throw new Error("DATABASE_CONFIGURATION_MISSING");

  const secrets = new SecretsManagerClient({ region: env.AWS_REGION ?? "ap-south-1" });
  try {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: env.DATABASE_SECRET_ARN }));
    if (!result.SecretString) throw new Error("DATABASE_SECRET_UNAVAILABLE");
    return buildDatabaseUrl(result.SecretString, env.DB_HOST);
  } finally {
    secrets.destroy();
  }
}

export async function runMigration() {
  const databaseUrl = await resolveDatabaseUrl();
  const prisma = spawn("./node_modules/.bin/prisma", [
    "migrate",
    "deploy",
    "--schema",
    "database/prisma/schema.prisma"
  ], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit"
  });

  prisma.on("error", error => {
    console.error("Failed to start Prisma migration process:", error.message);
    process.exitCode = 1;
  });
  prisma.on("exit", (code, signal) => {
    if (signal) {
      console.error(`Prisma migration process stopped by ${signal}`);
      process.exitCode = 1;
    } else {
      process.exitCode = code ?? 1;
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runMigration().catch(error => {
    console.error("Database migration failed:", error.message);
    process.exitCode = 1;
  });
}
