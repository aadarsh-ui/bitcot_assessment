# Database

## PostgreSQL architecture

The development environment uses Amazon RDS for PostgreSQL in private database subnets. The instance is not publicly accessible. Database security-group ingress is restricted to the application security groups. ECS uses the database for readiness checks and invokes Lambda operation handlers; Lambda functions use Prisma to read and mutate records.

## Credentials and rotation

RDS creates and manages the master-user secret in AWS Secrets Manager. The secret is active, encrypted by AWS KMS, and configured for automatic rotation every seven days. ECS, the migration task, and Lambda functions are configured with the secret ARN and retrieve the credential at runtime using scoped IAM permissions. The secret value is never passed by the CI workflow.

Runtime behavior:

1. Terraform obtains the RDS-managed secret ARN and configures it on the application resources.
2. GitHub Actions supplies the ARN as a deployment parameter/environment variable.
3. ECS and Lambda assume their task/function roles and call Secrets Manager `GetSecretValue`.
4. Prisma constructs the PostgreSQL connection URL in memory and performs database operations.

## Schema and migrations

Prisma models users and owned tasks. The deployment workflow builds the backend image and runs `prisma migrate deploy` as a one-off Fargate task in private subnets before application deployment. The workflow checks the task exit code and fails the release if migration fails.

For local development, use the repository's Prisma scripts and a local PostgreSQL instance; use `migrate dev` only for development. Do not run destructive migrations against the shared dev database without reviewing a backup and recovery plan.

## Operational practices and limits

- Dev backups use a seven-day retention period; verify restore procedures before production use.
- Use backward-compatible expand/contract migrations. Application rollback does not automatically reverse database schema changes.
- Protect the database with private routing, scoped security groups, encryption, and credentials from Secrets Manager.
- Dev uses cost-conscious capacity and is not a production high-availability configuration. Production should assess Multi-AZ, deletion protection, longer backup retention, restore tests, and connection pooling based on budget and load.
- An RDS read replica is not currently configured; add one only when measured read demand justifies its cost.
