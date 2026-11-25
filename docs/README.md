# Assessment Documentation

Start here for the deployed dev architecture and submission materials.

| Document | What it covers |
|---|---|
| [Architecture](./architecture.md) | Runtime architecture diagram, network boundaries, request flow, and CI/CD deployment sequence |
| [Deployment and testing](./deployment.md) | Dev deployment stages, required GitHub Environment variables, Terraform steps, and smoke-test checklist |
| [CI/CD](./ci-cd.md) | Pull-request validation, OIDC deployment gates, release sequence, and current recovery behavior |
| [Security and IAM](./security.md) | Network exposure, identity, role boundaries, and secret handling |
| [Database](./database.md) | RDS configuration, secret rotation, Prisma migrations, backups, and limitations |
| [Monitoring](./monitoring.md) | CloudWatch signals, alarm behavior, SNS notifications, and WebSocket stale connections |
| [Rollback](./rollback.md) | Verified ECS rollback drill and manual recovery boundaries for Lambda/frontend |
| [Assessment tracker](./assessment-tracker.md) | Requirement-by-requirement implementation and evidence status |
| [Submission package](./submission.md) | Repository link, final checklist, and email draft |
| [Loom outline](./loom-demo-script.md) | Suggested walkthrough script and recording safety checklist |

The Markdown Mermaid diagrams render directly on GitHub. All stated implementation claims are scoped to the dev environment; production deployment is not configured.
