import { PrismaClient } from "@prisma/client";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function createPrisma() {
  let url = process.env.DATABASE_URL;
  if (!url && process.env.DATABASE_SECRET_ARN) {
    const secrets = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
    const result = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.DATABASE_SECRET_ARN }));
    if (!result.SecretString) throw new Error("DATABASE_SECRET_UNAVAILABLE");
    const secret = JSON.parse(result.SecretString);
    const host = process.env.DB_HOST ?? secret.host;
    url = `postgresql://${encodeURIComponent(secret.username)}:${encodeURIComponent(secret.password)}@${host}:${secret.port ?? 5432}/${secret.dbname ?? "task_platform"}?sslmode=require`;
  }
  if (!url) throw new Error("DATABASE_CONFIGURATION_MISSING");
  return new PrismaClient({ datasourceUrl: url });
}

export const prisma = await createPrisma();

export async function databaseHealth(): Promise<boolean> {
  await prisma.$queryRaw`SELECT 1`;
  return true;
}
