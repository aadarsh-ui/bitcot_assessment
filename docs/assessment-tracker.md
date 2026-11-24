# Assessment Completion Tracker

This tracker reflects the **original assessment PDF**. “Design documented” is not the same as implemented, deployed, or verified.

| Requirement | Target component | Current status |
|---|---|---|
| React frontend interacts with GraphQL API | React/Apollo frontend and HTTPS GraphQL endpoint | Frontend source exists; AWS frontend is not uploaded and authenticated end-to-end verification is pending |
| Cost-optimized frontend with caching, access control, SSL | Private S3 + CloudFront OAC + TLS/cache policies | Private S3 bucket exists; CloudFront is disabled and the bucket is empty |
| Multiple TypeScript/Node.js Lambdas for GraphQL operations | SAM CRUD, publisher, and WebSocket handlers | Nine Node.js 22 functions and WebSocket API are deployed; read-only Lambda-to-RDS query passed; GraphQL/WebSocket acceptance tests pending |
| Private GraphQL server on ECS Fargate | Apollo ECS service in private subnets, API Gateway/VPC Link/Cloud Map ingress | Terraform resources are deployed and ECS has one running task; authenticated API smoke test and evidence capture pending |
| Private PostgreSQL RDS, reachable by ECS and Lambda | RDS/private subnets/security groups; both application paths | Private RDS is available; Lambda database query passed; ECS database readiness still needs live verification |
| Integrate Lambda, GraphQL, and RDS for operations | ECS invokes SAM; Lambda uses Prisma/RDS | Lambda-to-RDS read test passed; deployed GraphQL CRUD and subscription flow still needs end-to-end verification |
| GitHub Actions CI/CD | PR checks, OIDC dev deployment, protected prod gate | Workflow files exist; OIDC deployment workflow and production promotion remain unverified |
| CloudWatch Logs/Metrics/Alarms and alerts | CloudWatch + SNS | Terraform alarms/dashboard and Lambda log groups are deployed; SNS delivery test pending |
| IAM roles, access control, secrets | Least-privilege roles, verified JWT identity, Secrets Manager/KMS | RDS-managed secret and Lambda access are deployed; review policies and verify authenticated runtime paths |
| Secure environment variable/secret management | Runtime Secrets Manager retrieval and GitHub variables | Lambda secret retrieval succeeded as part of the read query; GitHub deployment variables and leakage scan remain |
| ECS, Lambda, RDS scaling strategy | ECS autoscaling, Lambda concurrency, RDS measured scaling | ECS autoscaling is configured; account Lambda concurrency is 10 shared executions; scale tests pending |
| Rollback to stable version | ECS rollback, Lambda version/alias, frontend artifact restore | Partially documented/configured; successful rollback drill pending |
| Architecture diagram | `docs/architecture.md` | Target diagram exists; reconcile with deployed infrastructure |
| Detailed deployment/security/CI/CD/database/monitoring/rollback docs | `docs/` runbooks | Documents exist; update to match verified deployment before submission |

The dev ECS/RDS/Terraform and SAM resources are deployed, but sanitized acceptance evidence is not yet recorded. Do not report the project as assessment-complete until implementation, end-to-end tests, and evidence are captured for every row.
