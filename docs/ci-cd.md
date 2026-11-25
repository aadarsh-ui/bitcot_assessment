# CI/CD

## Scope

The project uses a dev-only deployment pipeline. There is no production deployment workflow or production promotion stage; this is a deliberate assessment/time constraint, not a completed production release.

## Pull request validation

The `validate` job in [deploy-dev.yml](../.github/workflows/deploy-dev.yml) runs on pull requests and pushes:

- `npm ci`
- lint, typecheck, tests, and application build

The deploy job is skipped for pull requests. It runs only for a push to `main` and depends on validation.

## Development deployment

The `deploy` job targets GitHub Environment `dev`. It obtains short-lived AWS credentials by assuming the Terraform-managed IAM role with GitHub OIDC; no static AWS access keys are stored in GitHub. It validates required GitHub Environment variables before deployment and then:

1. Builds and pushes the ECS image to ECR with the source commit SHA.
2. Runs Prisma database migrations in a private one-off ECS task and fails on a non-zero exit code.
3. Builds and deploys Lambda/WebSocket resources through SAM and CloudFormation.
4. Updates ECS with an immutable image tag and waits for service stability. ECS deployment circuit breaker rollback is enabled.
5. Builds the React app and deploys it to the configured Amplify branch, waiting for deployment success.

The workflow passes `DATABASE_SECRET_ARN` into deployment configuration. Workloads fetch database credentials directly from Secrets Manager at runtime. The credential itself is not passed through GitHub Actions.

## Permissions and gates

- Pull request workflows do not receive AWS OIDC permissions.
- The deploy job has `id-token: write` only for the trusted deployment job.
- The IAM trust policy scopes the role to the repository's `main` branch and `dev` environment.
- Terraform supplies narrowly scoped roles for GitHub deployment, CloudFormation, ECS tasks, and Lambda functions.
- Keep third-party action versions reviewed and update them deliberately.

## Deployment and recovery status

The dev deployment has completed successfully: SAM reported no changes when already current, ECS reached a completed healthy rollout, and Amplify reported `SUCCEED`.

An ECS circuit-breaker rollback was tested using an intentionally missing ECR image tag; the failed deployment returned to the previous healthy task definition. Failed SAM stack updates use CloudFormation rollback. A successful but faulty Lambda or frontend release requires a manual source revert and redeployment; automatic Lambda alias rollback and frontend artifact restoration are not configured. See [rollback.md](./rollback.md).
