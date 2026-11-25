# Assessment Completion Tracker

This tracker reflects the **original assessment PDF**. “Design documented” is not the same as implemented, deployed, or verified.

| Requirement | Target component | Current status |
|---|---|---|
| React frontend interacts with GraphQL API | React/Apollo frontend and HTTPS GraphQL endpoint | Hosted in Amplify; API CORS and Cognito redirect configured. Hosted authenticated CRUD still needs a test |
| Cost-conscious AWS frontend with caching, access control, SSL | AWS Amplify Hosting, Cognito OIDC, HTTPS, CDN caching | Amplify default HTTPS domain is live; immutable assets and revalidating HTML use configured cache headers. Verify authenticated API access; custom domain is optional |
| Multiple TypeScript/Node.js Lambdas for GraphQL operations | SAM CRUD, publisher, and WebSocket handlers | Nine Node.js 22 functions are deployed; Lambda-to-RDS query passed; authenticated browser subscription received create/delete events; broader protocol coverage and evidence capture remain |
| Private GraphQL server on ECS Fargate | Apollo ECS service in private subnets, API Gateway/VPC Link/Cloud Map ingress | Terraform resources are deployed and ECS has one healthy task; authenticated GraphQL query and mutations passed; unauthenticated requests return 401; evidence capture pending |
| Private PostgreSQL RDS, reachable by ECS and Lambda | RDS/private subnets/security groups; both application paths | Private RDS is available; Lambda query passed; ECS readiness probe now runs a database query and the deployed task is healthy |
| Integrate Lambda, GraphQL, and RDS for operations | ECS invokes SAM; Lambda uses Prisma/RDS | Lambda-to-RDS read test passed; authenticated browser create/delete flow and live subscription events passed; full CRUD/ownership tests and evidence capture pending |
| GitHub Actions CI/CD | PR checks, OIDC dev deployment, protected prod gate | Backend deploy is working; Amplify deployment workflow is implemented but must be merged and exercised from GitHub after configuring `AMPLIFY_APP_ID` and `AMPLIFY_BRANCH`; production promotion is unverified |
| CloudWatch Logs/Metrics/Alarms and alerts | CloudWatch + SNS | Terraform alarms/dashboard and Lambda log groups are deployed; SNS delivery test pending |
| IAM roles, access control, secrets | Least-privilege roles, verified JWT identity, Secrets Manager/KMS | RDS-managed secret and Lambda access are deployed; review policies and verify authenticated runtime paths |
| Secure environment variable/secret management | Runtime Secrets Manager retrieval and GitHub variables | Lambda secret retrieval succeeded as part of the read query; GitHub deployment variables and leakage scan remain |
| ECS, Lambda, RDS scaling strategy | ECS autoscaling, Lambda concurrency, RDS measured scaling | ECS autoscaling is configured; account Lambda concurrency is 10 shared executions; scale tests pending |
| Rollback to stable version | ECS rollback, Lambda version/alias, frontend artifact restore | Partially documented/configured; successful rollback drill pending |
| Architecture diagram | `docs/architecture.md` | Target diagram exists; reconcile with deployed infrastructure |
| Detailed deployment/security/CI/CD/database/monitoring/rollback docs | `docs/` runbooks | Documents exist; update to match verified deployment before submission |

The dev ECS/RDS/Terraform and SAM resources are deployed, but sanitized acceptance evidence is not yet recorded. Do not report the project as assessment-complete until implementation, end-to-end tests, and evidence are captured for every row.
