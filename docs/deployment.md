# Deployment

1. Review the budget and compare the complete `ap-south-1` costs for API Gateway HTTP API, VPC Link, Cloud Map, WebSocket API, NAT/VPC endpoints, ECS, RDS, optional RDS Proxy, and CloudFront. AWS requires account verification before creating CloudFront resources; contact AWS Support and do not enable `enable_cloudfront` until verification is confirmed.
2. Provide `jwt_issuer_url` and `jwt_audience` for the assessment's approved OIDC provider. Keep all credentials out of Terraform variables and source; configure the database secret securely.
3. Bootstrap and review the Terraform state bucket if a remote backend is used.
4. Run `terraform fmt`, `validate`, and review the cost/security implications of `terraform plan`; inspect replacements, hourly resources, public ingress, and IAM changes.
5. To avoid an ECS task trying to pull an image before one exists, first apply only `aws_ecr_repository.graphql`, build the backend image, and push the immutable `bootstrap` tag. Then apply the reviewed full Terraform plan. ECS service creation starts at one task, and deployment workflows register later task-definition revisions with commit-SHA image tags.
6. Build/push an immutable ECS image tag. The workflow runs `prisma migrate deploy` as a one-off Fargate task in private app subnets before deploying SAM or updating ECS. The migration task reads the RDS-managed credential from Secrets Manager using a dedicated task role and reuses the ECS-to-database security-group path.
7. Generate the Prisma client before building SAM (`npm run generate --workspace database/prisma`); the SAM Makefile packages that generated client and the Lambda ARM64 engine into each function artifact. Lambda artifacts use ESM because `jose` is ESM-only. The browser WebSocket client omits the HTTP subprotocol header because API Gateway WebSocket does not negotiate it; the `graphql-transport-ws` messages are still used after the connection opens. The message Lambda role needs table-scoped DynamoDB access and `execute-api:ManageConnections` on the stage's connection-management methods (POST and DELETE). Deploy the built template with `sam build` and `sam deploy --template-file .aws-sam/build/template.yaml --config-env dev`, then register a new application task-definition revision and update the ECS service. ECS container health now uses `/ready`, which runs a database query; verify the deployed task health and authenticated GraphQL through the API Gateway URL.
8. Configure these GitHub `dev` Environment variables from Terraform/SAM outputs:

   | Variable | Source |
   | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | Terraform output `github_deploy_role_arn` |
   | `CLOUDFORMATION_EXECUTION_ROLE_ARN` | Terraform output `github_cloudformation_role_arn` |
   | `SAM_ARTIFACT_BUCKET` | Terraform output `sam_artifacts_bucket` |
   | `APP_SUBNET_A_ID`, `APP_SUBNET_B_ID` | First and second IDs from `app_subnet_ids` |
   | `LAMBDA_SECURITY_GROUP_ID` | Terraform output `lambda_security_group_id` |
   | `DATABASE_SECRET_ARN`, `DATABASE_ENDPOINT` | Terraform outputs of the same names |
   | `ECR_REPOSITORY_URL` | Terraform output `ecr_repository_url` |
   | `ECS_TASK_DEFINITION_FAMILY` | Terraform output `ecs_task_definition_family` |
   | `ECS_MIGRATION_TASK_DEFINITION_FAMILY` | Terraform output `ecs_migration_task_definition_family` |
   | `ECS_CLUSTER`, `ECS_SERVICE` | Terraform outputs `ecs_cluster_name`, `ecs_service_name` |
   | `ECS_SECURITY_GROUP_ID` | Terraform output `ecs_security_group_id` |
   | `GRAPHQL_HTTP_URL` | Terraform output `graphql_api_endpoint` |
   | `GRAPHQL_WS_URL` | SAM output `WebSocketUrl` |
   | `COGNITO_ISSUER` | Cognito user pool issuer URL |
   | `COGNITO_CLIENT_ID` | Cognito public SPA app client ID |
   | `COGNITO_REDIRECT_URI`, `COGNITO_LOGOUT_URI` | Allowed CloudFront HTTPS URL ending in `/` |

   The workflow checks that required variables are present before deployment. `FRONTEND_BUCKET` and `CLOUDFRONT_DISTRIBUTION_ID` are optional; the frontend deploy is skipped until both are configured. CloudFront is currently blocked by AWS account verification. The GitHub deploy role trusts the repository's `main` branch/dev environment and receives narrowly scoped ECR, ECS, CloudFormation, artifact-bucket, and role-passing permissions from Terraform. CloudFormation uses a separate execution role to manage only the SAM resources. The GitHub OIDC provider must exist before applying Terraform. The frontend is built from the root npm workspace install; do not run `npm ci` in `frontend` because it has no standalone lockfile.

The local frontend Cognito configuration is documented in `frontend/.env.example`. Copy it to `frontend/.env.local` for local work, and keep the callback and sign-out URLs registered in the Cognito app client. The app uses Cognito OIDC authorization-code flow and sends the ID token as a bearer token; never expose or commit a client secret. The WebSocket `$connect` route accepts transport connections without credentials; the message Lambda verifies the ID token from `connection_init` before it acknowledges the protocol connection or stores subscription state.

The backend image includes the Prisma schema and migration history. For manual database initialization, use the `dev-graphql-migration` ECS task definition and run it with Fargate in the private app subnets, the ECS security group, and `assignPublicIp=DISABLED`. Check the task's exit code and `/ecs/dev-graphql-api` migration log stream before deploying application traffic. The GitHub workflow performs this one-off task for each deploy before SAM and ECS updates.
9. Upload hashed frontend assets with long cache headers, `index.html` with revalidation headers, and invalidate CloudFront.

Use immutable image tags and preserve ECS task-definition revisions. Production promotion requires the protected `production` GitHub Environment.

The ECS service uses API Gateway HTTP API → VPC Link → Cloud Map SRV service discovery; ECS tasks remain private. The JWT-protected `$default` route handles GraphQL requests. An explicit unauthenticated `OPTIONS /{proxy+}` route forwards browser preflights to the backend CORS middleware; keep the allowed origins restricted to configured frontend origins. Enable RDS Proxy only if connection testing justifies the additional cost (`enable_rds_proxy = true`); when disabled, ECS/Lambda connect directly to RDS within their restricted security groups.

The HTTP API uses a JWT authorizer. Set the required issuer and audience Terraform inputs to the same values the GraphQL service validates. The WebSocket API has separate `graphql-transport-ws` authentication and must be tested independently.
