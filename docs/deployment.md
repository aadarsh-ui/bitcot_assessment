# Deployment

1. Review the budget and compare the complete `ap-south-1` costs for API Gateway HTTP API, VPC Link, Cloud Map, WebSocket API, NAT/VPC endpoints, ECS, RDS, and optional RDS Proxy.
2. Provide `jwt_issuer_url` and `jwt_audience` for the assessment's approved OIDC provider. Keep all credentials out of Terraform variables and source; configure the database secret securely.
3. Bootstrap and review the Terraform state bucket if a remote backend is used.
4. Run `terraform fmt`, `validate`, and review the cost/security implications of `terraform plan`; inspect replacements, hourly resources, public ingress, and IAM changes.
5. To avoid an ECS task trying to pull an image before one exists, first apply only `aws_ecr_repository.graphql`, build the backend image, and push the immutable `bootstrap` tag. Then apply the reviewed full Terraform plan. ECS service creation starts at one task, and deployment workflows register later task-definition revisions with commit-SHA image tags.
6. Build/push an immutable ECS image tag. The workflow runs `prisma migrate deploy` as a one-off Fargate task in private app subnets before deploying SAM or updating ECS. The migration task reads the RDS-managed credential from Secrets Manager using a dedicated task role and reuses the ECS-to-database security-group path.
7. Generate the Prisma client before building SAM (`npm run generate --workspace database/prisma`); the SAM Makefile packages that generated client and the Lambda ARM64 engine into each function artifact. Deploy the built template with `sam build` and `sam deploy --template-file .aws-sam/build/template.yaml --config-env dev`, then register a new application task-definition revision, update the ECS service, and verify GraphQL through the API Gateway URL and direct ECS database readiness separately.
8. Configure these GitHub `dev` Environment variables from Terraform/SAM outputs:

   | Variable | Source |
   | --- | --- |
   | `AWS_DEPLOY_ROLE_ARN` | Terraform output `github_deploy_role_arn` |
   | `APP_SUBNET_A_ID`, `APP_SUBNET_B_ID` | First and second IDs from `app_subnet_ids` |
   | `LAMBDA_SECURITY_GROUP_ID` | Terraform output `lambda_security_group_id` |
   | `DATABASE_SECRET_ARN`, `DATABASE_ENDPOINT` | Terraform outputs of the same names |
   | `ECR_REPOSITORY_URL` | Terraform output `ecr_repository_url` |
   | `ECS_TASK_DEFINITION_FAMILY` | Terraform output `ecs_task_definition_family` |
   | `ECS_MIGRATION_TASK_DEFINITION_FAMILY` | Terraform output `ecs_migration_task_definition_family` |
   | `ECS_CLUSTER`, `ECS_SERVICE` | Terraform outputs `ecs_cluster_name`, `ecs_service_name` |
   | `ECS_SECURITY_GROUP_ID` | Terraform output `ecs_security_group_id` |
   | `FRONTEND_BUCKET` | Terraform output `frontend_bucket_name` |
   | `CLOUDFRONT_DISTRIBUTION_ID` | Terraform output `cloudfront_distribution_id` |
   | `GRAPHQL_HTTP_URL` | Terraform output `graphql_api_endpoint` |
   | `GRAPHQL_WS_URL` | SAM output `WebSocketUrl` |
   | `COGNITO_ISSUER` | Cognito user pool issuer URL |
   | `COGNITO_CLIENT_ID` | Cognito public SPA app client ID |
   | `COGNITO_REDIRECT_URI`, `COGNITO_LOGOUT_URI` | Allowed CloudFront HTTPS URL ending in `/` |

   The workflow checks that required variables are present before deployment. The GitHub OIDC role currently has a trust policy but no deployment permissions attached; add and review a least-privilege policy before running the deploy job. The frontend is built from the root npm workspace install; do not run `npm ci` in `frontend` because it has no standalone lockfile.

The local frontend Cognito configuration is documented in `frontend/.env.example`. Copy it to `frontend/.env.local` for local work, and keep the callback and sign-out URLs registered in the Cognito app client. The app uses Cognito OIDC authorization-code flow and sends the ID token as a bearer token; never expose or commit a client secret. The WebSocket `$connect` route accepts transport connections without credentials; the message Lambda verifies the ID token from `connection_init` before it acknowledges the protocol connection or stores subscription state.

The backend image includes the Prisma schema and migration history. For manual database initialization, use the `dev-graphql-migration` ECS task definition and run it with Fargate in the private app subnets, the ECS security group, and `assignPublicIp=DISABLED`. Check the task's exit code and `/ecs/dev-graphql-api` migration log stream before deploying application traffic. The GitHub workflow performs this one-off task for each deploy before SAM and ECS updates.
9. Upload hashed frontend assets with long cache headers, `index.html` with revalidation headers, and invalidate CloudFront.

Use immutable image tags and preserve ECS task-definition revisions. Production promotion requires the protected `production` GitHub Environment.

The ECS service uses API Gateway HTTP API → VPC Link → Cloud Map SRV service discovery; ECS tasks remain private. Enable RDS Proxy only if connection testing justifies the additional cost (`enable_rds_proxy = true`); when disabled, ECS/Lambda connect directly to RDS within their restricted security groups.

The HTTP API uses a JWT authorizer. Set the required issuer and audience Terraform inputs to the same values the GraphQL service validates. The WebSocket API has separate `graphql-transport-ws` authentication and must be tested independently.
