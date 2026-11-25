# CI/CD

Pull requests run lint, type checking, tests, builds, and Terraform/SAM validation. A push to `main` runs validation and deploys the SAM Lambda functions, ECS service, and React frontend to the single development environment using GitHub OIDC.

The production workflow is currently a placeholder: it runs checks but does not deploy. The assessment environment is therefore the dev deployment; do not describe it as a separate production deployment.

The dev deployment creates any missing Lambda log groups and applies 14-day retention. Its GitHub OIDC role has narrowly scoped `logs:CreateLogGroup` and `logs:PutRetentionPolicy` permissions for dev Lambda log groups.

ECS uses a deployment circuit breaker with rollback. Failed CloudFormation/SAM stack updates roll back automatically. Recovery from a successful but faulty Lambda or frontend release currently requires reverting the source commit and allowing the normal `main` deployment to redeploy it; see [rollback.md](./rollback.md). Production promotion and automatic cross-service rollback are not implemented.
