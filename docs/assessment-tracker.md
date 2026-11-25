# Assessment Completion Tracker

This tracker distinguishes implementation, deployment, and verification. The assessed deployment is dev-only; there is no production deployment workflow.

| Requirement | Implementation / evidence | Status |
|---|---|---|
| React frontend + GraphQL | React/Apollo hosted on Amplify; HTTPS and Cognito; authenticated operations verified | Implemented and deployed |
| Cost-conscious hosting, caching, access control, TLS | Amplify managed hosting/CDN, Cognito, hashed-asset caching and HTML revalidation | Implemented and deployed; custom domain not configured |
| TypeScript/Node.js Lambda operations | Nine SAM-managed Node.js functions for CRUD, event publishing, and WebSocket routes | Deployed; Lambda-to-RDS operation verified |
| Private GraphQL server | Apollo on ECS Fargate behind API Gateway, VPC Link, and Cloud Map; tasks have no public IP | Deployed; current ECS rollout healthy |
| Private RDS and connectivity | PostgreSQL in private DB subnets; ECS and Lambda connectivity; readiness query | Deployed and verified |
| Lambda/GraphQL/RDS integration | ECS invokes operation Lambdas; Lambda uses Prisma/RDS | Authenticated operations and subscription delivery verified |
| GitHub Actions CI/CD | PR validation; `main` dev deployment via OIDC; migrations, SAM, ECS, and Amplify | Dev workflow completed successfully; production workflow is not configured |
| CloudWatch monitoring and alerts | Dashboard, 24 alarms, SNS action; Lambda log retention | Deployed; last check all alarms `OK`; SNS test delivery previously verified |
| IAM and secret management | GitHub OIDC; workload roles; RDS-managed Secrets Manager secret and automatic rotation | Verified; secret ARN only passed through deployment, value fetched at runtime |
| Scaling | ECS Application Auto Scaling; Lambda concurrency subject to account quota; RDS storage/capacity decisions | Configured/documented; production-scale/load test not performed |
| Rollback strategy | ECS circuit breaker rollback drill; CloudFormation rollback on failed stack update | ECS rollback verified; automatic successful-release Lambda/frontend rollback is not configured |
| Architecture diagram | [Deployed architecture](./architecture.md) | Documented |
| Detailed documentation | Deployment, CI/CD, security, database, monitoring, rollback runbooks | Documented; use [submission guide](./submission.md) |
| Loom walkthrough | Presenter outline and checklist | Record and attach before submission |

## Remaining before submission

- Capture current, sanitized screenshots/CLI output for the deployed app, healthy ECS service, private RDS, Secrets Manager metadata (not the secret value), alarms/dashboard, and successful workflow.
- Record a Loom walkthrough using [loom-demo-script.md](./loom-demo-script.md), then add its share link to the submission email.
- Provide the repository URL and ensure the final intended branch/PRs are merged before sending.
- Clearly state the scope is dev-only. Do not claim production deployment, Lambda alias rollback, or frontend artifact rollback.
