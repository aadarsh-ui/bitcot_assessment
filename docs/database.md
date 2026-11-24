# Database

Prisma models a UUID `User` and owned `Task` records. Status and priority are PostgreSQL enums. The migration includes owner/status indexes.

Local: `npx prisma migrate dev --name describe_change`.
Deployment: `npx prisma migrate deploy`.

The RDS-managed master credential is stored in Secrets Manager and encrypted with KMS, avoiding a generated plaintext password in Terraform configuration/state. Application roles receive only the secret ARN and fetch the value at runtime. Backups are enabled with a 7-day dev retention. Production should add Multi-AZ, deletion protection, longer retention, and restore tests.
