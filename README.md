# GraphQL Serverless Task Platform

AWS assessment implementation for a React task-management application built with Apollo GraphQL on ECS Fargate, AWS Lambda, RDS PostgreSQL/Proxy, Terraform, AWS SAM, and GitHub Actions.

## Architecture

- React 18 + TypeScript + Vite + Apollo Client
- Apollo GraphQL Server + `graphql-transport-ws`
- ECS Fargate in private subnets, reached through API Gateway and a VPC Link
- Separate TypeScript Lambda CRUD and WebSocket handlers deployed with SAM
- RDS PostgreSQL (RDS Proxy enabled only if its measured connection benefit justifies the cost)
- Prisma migrations and ownership enforcement
- Private S3 origin and CloudFront with OAC
- CloudWatch, SNS, and GitHub OIDC

See [the recommended assessment architecture](docs/architecture.md) for the no-ALB design, request/event flows, scaling approach, cost controls, and acceptance evidence. Terraform configures API Gateway HTTP API → VPC Link → Cloud Map → private ECS. Infrastructure still requires `terraform validate` and a reviewed plan before applying in AWS.

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
