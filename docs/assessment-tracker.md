# Assessment Completion Tracker

This tracker reflects the **original assessment PDF**. “Design documented” is not the same as implemented, deployed, or verified.

| Requirement | Target component | Current status |
|---|---|---|
| React frontend interacts with GraphQL API | React/Apollo frontend and HTTPS GraphQL endpoint | Hosted in Amplify; authenticated browser CRUD and GraphQL subscriptions passed; anonymous HTTP GraphQL requests return 401 |
| Cost-conscious AWS frontend with caching, access control, SSL | AWS Amplify Hosting, Cognito OIDC, HTTPS, CDN caching | Amplify HTTPS is live; immutable assets and revalidating HTML use the expected cache headers; authenticated app/API access verified. Custom domain is optional |
| Multiple TypeScript/Node.js Lambdas for GraphQL operations | SAM CRUD, publisher, and WebSocket handlers | Nine Node.js 22 functions are deployed; Lambda-to-RDS query passed; authenticated browser create/update/delete and live subscription events passed. Stale-connection handling fix is merged and deployed |
| Private GraphQL server on ECS Fargate | Apollo ECS service in private subnets, API Gateway/VPC Link/Cloud Map ingress | Terraform resources are deployed and ECS has one healthy task; authenticated GraphQL query and mutations passed; unauthenticated requests return 401; evidence capture pending |
| Private PostgreSQL RDS, reachable by ECS and Lambda | RDS/private subnets/security groups; both application paths | Private RDS is available; Lambda query passed; ECS readiness probe now runs a database query and the deployed task is healthy |
| Integrate Lambda, GraphQL, and RDS for operations | ECS invokes SAM; Lambda uses Prisma/RDS | Lambda-to-RDS read passed; authenticated browser create/update/delete flow and live subscription events passed; test record was removed |
| GitHub Actions CI/CD | PR checks, OIDC dev deployment, frontend/backend deployment | GitHub Actions validates, tests, builds, and deploys SAM Lambdas, ECS, and Amplify to dev; latest main deployment succeeded. No production deployment is configured |
| CloudWatch Logs/Metrics/Alarms and alerts | CloudWatch + SNS | Dashboard and alarms are deployed; SNS test notification was delivered; all nine Lambda logs have 14-day retention. The stale WebSocket `GoneException` fix is deployed. API p95 latency alarm and missing-data handling are applied; the latency alarm currently has `INSUFFICIENT_DATA` because no recent metric data is available. |
| IAM roles, access control, secrets | Least-privilege roles, verified JWT identity, Secrets Manager/KMS | Dev ECS/Lambda/GitHub OIDC permissions and secret access were checked; intended actions were allowed and unrelated actions denied in the tested simulations |
| Secure environment variable/secret management | Runtime Secrets Manager retrieval and GitHub variables | Database credentials are retrieved from Secrets Manager at runtime; GitHub uses OIDC and configuration identifiers rather than stored AWS keys or database passwords |
| ECS, Lambda, RDS scaling strategy | ECS autoscaling, Lambda concurrency, RDS measured scaling | ECS autoscaling (1–2 tasks) was exercised out and back in; account Lambda concurrency is 10 shared executions; RDS storage autoscaling is configured, with no read replicas or instance-class autoscaling |
| Rollback to stable version | ECS rollback, Lambda version/alias, frontend artifact restore | ECS circuit-breaker rollback was verified and SAM rolls back failed stack updates. For successful but faulty Lambda/frontend releases, documented recovery is a source revert and redeployment. Automated Lambda alias rollback and frontend artifact restoration are not configured. |
| Architecture diagram | `docs/architecture.md` | Target diagram exists; reconcile with deployed infrastructure |
| Detailed deployment/security/CI/CD/database/monitoring/rollback docs | `docs/` runbooks | Documents exist; update to match verified deployment before submission |

The dev ECS/RDS/Terraform and SAM resources are deployed. The dev CI/CD path and authenticated application flows have been verified. This is a single dev environment; production deployment is not implemented. Do not describe manual source-revert recovery as automated rollback.
