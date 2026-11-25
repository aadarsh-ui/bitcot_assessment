# GraphQL Serverless Task Platform

Dev-only AWS assessment implementation for a React task-management application built with Apollo GraphQL on ECS Fargate, AWS Lambda, RDS PostgreSQL, Terraform, AWS SAM, and GitHub Actions.

## Architecture

- React 18 + TypeScript + Vite + Apollo Client
- Apollo GraphQL Server + `graphql-transport-ws`
- ECS Fargate in private subnets, reached through API Gateway and a VPC Link
- Separate TypeScript Lambda CRUD and WebSocket handlers deployed with SAM
- RDS PostgreSQL (RDS Proxy enabled only if its measured connection benefit justifies the cost)
- Prisma migrations and ownership enforcement
- AWS Amplify Hosting with HTTPS and managed CDN/cache
- CloudWatch, SNS, and GitHub OIDC

See the [deployed architecture](docs/architecture.md) and [submission guide](docs/submission.md). The development deployment uses API Gateway HTTP API → VPC Link → Cloud Map → private ECS. GitHub Actions deploys to dev only; production deployment is not configured.

Detailed guides: [deployment/testing](docs/deployment.md), [CI/CD](docs/ci-cd.md), [security/IAM](docs/security.md), [database/secrets](docs/database.md), [monitoring](docs/monitoring.md), and [rollback](docs/rollback.md).

## Local setup

```bash
npm install
docker compose up -d
cp backend/.env.example .env
npm run generate --workspace database/prisma
npm run deploy --workspace database/prisma
npm run dev
npm run frontend
```

Set `DATABASE_URL` to `postgresql://task_user:task_password@127.0.0.1:5433/task_platform?sslmode=disable`.
The local test identity is `Bearer test-token`.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
terraform -chdir=infrastructure/terraform/environments/dev fmt -check -recursive
sam validate --lint --template-file lambdas/template.yaml
docker build -f backend/Dockerfile .
```
