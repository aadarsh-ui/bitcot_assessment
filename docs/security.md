# Security and IAM

## Network controls

- ECS Fargate tasks run in private application subnets with public IP assignment disabled.
- RDS PostgreSQL is deployed in private database subnets and `publicly_accessible = false`.
- API Gateway HTTP API is the public HTTPS ingress; it connects to the private ECS service through a VPC Link and Cloud Map.
- Security groups limit database access to application workloads. Do not add a public database ingress rule.
- The browser authenticates through Cognito. The HTTP API validates JWT issuer/audience; the GraphQL application derives the user identity from verified claims and enforces ownership.
- WebSocket clients authenticate during `connection_init` over WSS. Do not put bearer tokens in query strings or trust user-supplied identity fields.

## Identity and permissions

- GitHub Actions uses OIDC and short-lived role credentials; no static AWS access keys are required.
- Separate IAM roles are used for GitHub deployment, CloudFormation, ECS runtime/migration tasks, and each SAM Lambda.
- ECS and Lambda roles have `secretsmanager:GetSecretValue` access scoped to the RDS-managed secret ARN.
- ECS receives only the Lambda invoke permissions needed for GraphQL operations. Lambda permissions for DynamoDB and API Gateway connection management are scoped to their required resources.
- Review Terraform IAM changes before applying. Never grant broad `*` permissions to solve a deployment error without narrowing the resource and action.

## Secret handling

RDS manages the PostgreSQL master credential in Secrets Manager and rotates it automatically. The application receives the secret ARN and reads the secret at runtime using its task/function role. GitHub Actions passes the ARN as non-secret deployment configuration; it does not read or relay the password.

Do not expose secret values in Git, GitHub logs, Terraform outputs, task-definition plaintext environment variables, container layers, browser bundles, or application logs. Public frontend configuration such as Cognito issuer/client ID and API URLs is not a credential.

## Logging and application safety

Avoid logging credentials, tokens, database URLs, or sensitive payloads. Keep Lambda and ECS log retention configured. Keep dependencies patched, validate and authorize GraphQL operations, and avoid using browser-provided IDs as authorization evidence.
