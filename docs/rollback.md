# Rollback

## What is automated and verified

- **ECS:** the deployment circuit breaker is enabled. A controlled failing revision was tested; ECS returned to the prior healthy task-definition revision. If a failed deployment does not restore service automatically, update the service to the last known-good task-definition revision and wait for the service to become stable.
- **SAM/Lambda:** CloudFormation rolls back a stack update that fails before completion. Lambda functions do not currently use published versions or aliases, so a successful but faulty release does not have instant alias rollback.
- **Amplify:** the workflow waits for Amplify deployment completion and fails if it reports failure. The pipeline does not retain a separately managed prior build artifact for automatic restoration.

## Recovery for a successful but faulty application release

The current practical rollback is a source-controlled redeployment:

1. Identify the last known-good commit from the successful GitHub Actions run.
2. Revert the faulty commit on `main` (do not force-push shared history).
3. Let the normal validated `main` workflow rebuild and deploy both SAM/Lambda and the frontend; ECS uses the image built from that reverted commit.
4. Verify the GraphQL health/auth path, authenticated task operations, ECS steady state, and Amplify deployment result.

This is a manual recovery procedure, not an automated cross-service rollback. Automated Lambda alias promotion and frontend artifact promotion/restore remain future improvements.

## Database migrations

Application rollback does not automatically reverse database migrations. Use backward-compatible expand/contract migrations, take/verify backups before destructive schema changes, and roll forward or restore from a backup if a migration cannot be safely reversed. Do not assume the previous application image is compatible with a destructive schema change.
