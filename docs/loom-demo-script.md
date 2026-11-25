# Loom Walkthrough Outline

Target length: 5-7 minutes. Use a test account and sanitized data. Never show a password, token, secret value, `.env` file, or unredacted credential.

## 1. Introduction (30 seconds)

> This is my DevOps assessment implementation: a React GraphQL application deployed to AWS development. I will show the architecture, deployment flow, security choices, monitoring, and rollback behavior. Production deployment is intentionally out of scope.

## 2. Architecture (60-90 seconds)

Open [architecture.md](./architecture.md) and walk through the diagram:

- React frontend on Amplify over HTTPS, authenticated with Cognito.
- API Gateway HTTP API through VPC Link and Cloud Map to private ECS Fargate.
- ECS GraphQL operations invoke SAM Lambdas; Lambda and ECS connect to private PostgreSQL.
- WebSocket API and Lambda handlers support authenticated subscriptions with DynamoDB connection state.
- Secrets Manager, IAM, CloudWatch/SNS, Terraform, SAM, and GitHub Actions.

## 3. Application and AWS evidence (60-90 seconds)

- Show the hosted app loading over HTTPS and sign in with a prepared test user.
- Demonstrate a safe GraphQL read and one create/update/delete operation; remove test data afterward.
- Show the ECS service with one running task and a completed deployment.
- Show RDS as not publicly accessible and its private subnet placement.
- In Secrets Manager, show metadata/rotation status only. Do not click “Retrieve secret value.”

## 4. CI/CD (60-90 seconds)

Open the successful GitHub Actions run:

- Explain PR validation and that deployment is restricted to pushes to `main`.
- Show GitHub OIDC authentication, immutable ECR image tag, migration task, SAM deployment, ECS stability wait, and Amplify deployment.
- Explain that the workflow passes the secret ARN; workloads read the credential at runtime.
- State clearly that the pipeline targets dev only; production is not configured.

## 5. Monitoring and rollback (60-90 seconds)

- Show the CloudWatch dashboard and alarm states; mention SNS notification routing.
- Explain missing-data handling for low-traffic alarms.
- Show ECS circuit-breaker settings and summarize the controlled missing-image rollback drill: the bad revision failed and ECS returned to the previous healthy task.
- Clarify that successful-but-faulty Lambda/frontend releases require manual source revert/redeployment; automated Lambda alias and frontend artifact rollback are future work.

## 6. Close (20 seconds)

> The repository contains the deployment, security, database, monitoring, rollback documentation, and architecture diagram. The deployment is dev-only; the remaining production-grade rollback and production promotion work is explicitly documented.

## Recording checklist

- Browser and console show no secret values, session tokens, personal data, or sensitive notifications.
- Use the correct repository and latest successful workflow run.
- Share the Loom video with reviewer access and include its URL in the submission email.
