import { PrismaClient } from "@prisma/client";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
let prisma: PrismaClient | undefined;
let expires = 0;

export async function getPrisma() {
  if (prisma && Date.now() < expires) return prisma;
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && process.env.DB_SECRET_ARN) {
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
    if (!result.SecretString) throw new Error("DATABASE_SECRET_UNAVAILABLE");
    const secret = JSON.parse(result.SecretString);
    const host = process.env.DB_HOST ?? secret.host;
    databaseUrl = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${host}:${secret.port ?? 5432}/${secret.dbname ?? "task_platform"}?sslmode=require`;
  }
  if (!databaseUrl) throw new Error("DATABASE_CONFIGURATION_MISSING");
  prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  expires = Date.now() + 5 * 60 * 1000;
  return prisma;
}
