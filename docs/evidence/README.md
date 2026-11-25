# Evidence

This folder is for sanitized deployment evidence. Do not store credentials, JWTs, database passwords, account numbers, or private identifiers.

Record:

- Terraform plan/apply output and resource IDs
- SAM validation/build/deploy output
- ECS service/task details and target health
- Lambda invocation and CloudWatch logs
- RDS private configuration and proxy target health
- GraphQL CRUD and WebSocket `next` test output
- Amplify HTTPS URL and static-asset/HTML cache headers
- SNS alarm notification
- Scaling and rollback drill evidence

Also capture the successful GitHub Actions run, Cognito-authenticated GraphQL operations, ECS steady-state rollout, RDS private-access settings, Secrets Manager metadata/rotation status, and CloudWatch dashboard/alarm state. Never capture the secret value, credentials, JWTs, or sensitive user data.
