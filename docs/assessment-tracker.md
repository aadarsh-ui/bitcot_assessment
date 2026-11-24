# Assessment Completion Tracker

This tracker reflects the **original assessment PDF**. “Design documented” is not the same as implemented, deployed, or verified.

| Requirement | Target component | Current status |
|---|---|---|
| React frontend interacts with GraphQL API | React/Apollo frontend and HTTPS GraphQL endpoint | Local application exists; AWS end-to-end verification pending |
| Cost-optimized frontend with caching, access control, SSL | Private S3 + CloudFront OAC + TLS/cache policies | Target documented; Terraform/deployment verification pending |
| Multiple TypeScript/Node.js Lambdas for GraphQL operations | SAM CRUD, publisher, and WebSocket handlers | Handler sources/template exist; SAM validation/deployment/integration testing pending |
| Private GraphQL server on ECS Fargate | Apollo ECS service in private subnets, API Gateway/VPC Link/Cloud Map ingress | Backend and target ingress configuration exist; AWS deployment/verification pending |
| Private PostgreSQL RDS, reachable by ECS and Lambda | RDS/private subnets/security groups; both application paths | Terraform target exists, but private paths/deployment require validation |
| Integrate Lambda, GraphQL, and RDS for operations | ECS invokes SAM; Lambda uses Prisma/RDS | Local GraphQL smoke checks passed; deployed integration/evidence pending |
| GitHub Actions CI/CD | PR checks, OIDC dev deployment, protected prod gate | Workflow files exist; end-to-end workflow/OIDC verification pending |
| CloudWatch Logs/Metrics/Alarms and alerts | CloudWatch + SNS | Partial Terraform/doc coverage; Lambda/API alarms and SNS delivery test pending |
| IAM roles, access control, secrets | Least-privilege roles, verified JWT identity, Secrets Manager/KMS | Partial source/config; policy review and deployed secret validation pending |
| Secure environment variable/secret management | Runtime Secrets Manager retrieval and GitHub variables | Local configuration exists; AWS runtime verification/leakage scan pending |
| ECS, Lambda, RDS scaling strategy | ECS autoscaling, Lambda concurrency, RDS measured scaling | Strategy documented; ECS autoscaling implementation and scale tests pending |
| Rollback to stable version | ECS rollback, Lambda version/alias, frontend artifact restore | Partially documented/configured; successful rollback drill pending |
| Architecture diagram | `docs/architecture.md` | Target diagram exists; reconcile with deployed infrastructure |
| Detailed deployment/security/CI/CD/database/monitoring/rollback docs | `docs/` runbooks | Documents exist; update to match verified deployment before submission |

No AWS deployment evidence is currently recorded. Do not report the project as assessment-complete until implementation, deployment, tests, and sanitized evidence are captured for every row.
