# Development Deployment and Testing

## Environment

The assessment deployment is a single AWS development environment in `ap-south-1`. Terraform provisions infrastructure and SAM/CloudFormation manages the Lambda/WebSocket stack. Production deployment is intentionally not configured.

## Automated deployment

The GitHub Actions workflow [deploy-dev.yml](../.github/workflows/deploy-dev.yml) runs validation for pull requests and pushes. The deploy job runs only for a push to `main`, uses the protected `dev` GitHub Environment, and assumes the AWS deploy role with GitHub OIDC.

The deployment sequence is:

1. Install dependencies and run lint, typecheck, tests, and build.
2. Generate Prisma client and build/validate the SAM template.
3. Build the backend image with the commit SHA as an immutable ECR tag and push it.
4. Register and run the database migration as a one-off Fargate task in private application subnets; stop if it fails.
5. Deploy the Lambda and WebSocket stack with SAM, passing the secret ARN and non-secret configuration.
6. Register an ECS task definition using the immutable image tag, update the service, and wait until the service is stable.
7. Build the React frontend with public API/Cognito configuration, upload it to Amplify, start deployment, and wait for `SUCCEED`.

## Required GitHub `dev` Environment variables

Configure these values from Terraform/SAM outputs or the Cognito configuration. They are identifiers and configuration, not secret credentials.

| Variable | Purpose/source |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | Terraform GitHub OIDC role output |
| `CLOUDFORMATION_EXECUTION_ROLE_ARN` | Terraform CloudFormation role output |
| `SAM_ARTIFACT_BUCKET` | Terraform SAM artifact bucket output |
| `APP_SUBNET_A_ID`, `APP_SUBNET_B_ID` | Private application subnet IDs |
| `LAMBDA_SECURITY_GROUP_ID`, `ECS_SECURITY_GROUP_ID` | Workload security groups |
| `DATABASE_SECRET_ARN` | RDS-managed Secrets Manager ARN |
| `DATABASE_ENDPOINT` | RDS endpoint |
| `ECR_REPOSITORY_URL` | Terraform ECR repository output |
| `ECS_TASK_DEFINITION_FAMILY`, `ECS_MIGRATION_TASK_DEFINITION_FAMILY` | ECS task-definition families |
| `ECS_CLUSTER`, `ECS_SERVICE` | ECS cluster and service names |
| `GRAPHQL_HTTP_URL`, `GRAPHQL_WS_URL` | API Gateway HTTP and WebSocket endpoints |
| `COGNITO_ISSUER`, `COGNITO_CLIENT_ID` | Cognito user-pool issuer and public SPA client ID |
| `AMPLIFY_APP_ID`, `AMPLIFY_BRANCH` | Amplify Hosting app and branch identifiers |

Never put the database password or other runtime secret values in GitHub variables, workflow YAML, Terraform variables, container images, or frontend build variables. GitHub Actions receives AWS access through OIDC and passes only the secret ARN to deployment resources.

## Manual infrastructure workflow

Run Terraform from `infrastructure/terraform/environments/dev`:

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan
```

Review the plan for replacements, deletions, public ingress, IAM scope, and recurring cost before applying. Do not use a broad apply to change production or unrelated resources. Terraform backend configuration and required variables must be set for the target AWS account before running these commands.

## Verification checklist

- GitHub Actions validation and dev deployment jobs finish successfully.
- ECS service has the desired number of running tasks and rollout state `COMPLETED`.
- SAM/CloudFormation stack is `*_COMPLETE`; no failed migration task.
- Amplify deployment job reaches `SUCCEED`.
- Hosted React app loads over HTTPS; Cognito sign-in works.
- Authenticated GraphQL query and task mutations work; anonymous GraphQL requests are rejected.
- Subscription receives the expected event and stale connections are cleaned up.
- Lambda-to-RDS operation and ECS database readiness check work.
- CloudWatch dashboard, alarm states, log retention, and SNS notification path are reviewed.

Capture sanitized screenshots or command outputs for the submission. Do not include secret values, ID tokens, or personally identifiable information.

## Local development

See the root [README](../README.md) for installing dependencies and running the local application with Docker Compose. Use `.env.example` files as templates; do not commit local `.env` files.
