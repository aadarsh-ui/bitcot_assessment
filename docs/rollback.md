# Rollback and Recovery

## ECS: automatic deployment rollback

The ECS service deployment circuit breaker is enabled with rollback. It was tested using an intentionally missing ECR image tag. ECS failed to start the new task and returned the service to its previous healthy task definition. The current dev service is healthy with one running task and a completed rollout.

If a real deployment fails:

1. Check ECS service events and the deployment rollout reason.
2. Confirm the circuit breaker returned to the previous task definition and the service is steady.
3. If necessary, update the ECS service to the last known-good task-definition revision and wait for stability.
4. Validate `/ready` and authenticated GraphQL operations before closing the incident.

## SAM/Lambda and frontend

CloudFormation rolls back a SAM stack update that fails before stack completion. Lambda functions do not currently use published versions/aliases with automated traffic shifting. Amplify deployment failure is surfaced by the workflow, but a successful faulty frontend build is not automatically restored from a retained artifact.

For a successful but faulty Lambda or frontend release, the current recovery is manual:

1. Identify the last known-good commit from GitHub Actions.
2. Revert the faulty commit on `main` without rewriting shared history.
3. Allow the validated development workflow to redeploy.
4. Verify GraphQL auth/CRUD, subscription behavior, ECS health, and Amplify deployment status.

This is manual source rollback and redeployment, not automatic cross-service rollback. Lambda alias promotion and frontend artifact promotion/restore remain future work.

## Database migrations

Application rollback does not reverse database migrations. Use backward-compatible expand/contract changes. Before destructive schema operations, verify a current backup and a tested restore path; if the prior application cannot use the migrated schema, roll forward or restore the database deliberately.
