# Deployed Architecture

This diagram describes the **development environment that is deployed and verified**. It is not a production architecture. The frontend is hosted by AWS Amplify; the private GraphQL service runs on ECS Fargate; SAM manages the Lambda and WebSocket resources.

## Architecture diagram

![High-resolution deployed AWS development architecture](./architecture-diagram.png)

```mermaid
flowchart LR
  subgraph CLIENT["Client"]
    Browser[User browser]
    React[React + Apollo SPA]
  end

  subgraph AWS["AWS account · ap-south-1"]
    subgraph EDGE["Managed public endpoints"]
      Amplify[AWS Amplify Hosting<br/>HTTPS · managed CDN/cache]
      Cognito[Cognito User Pool<br/>OIDC sign-in]
      HttpApi[API Gateway HTTP API<br/>JWT authorizer]
      WsApi[API Gateway WebSocket API<br/>WSS transport]
    end

    subgraph VPC["VPC · private application and database tiers"]
      subgraph PUBLIC["Public subnets · ingress/NAT"]
        IGW[Internet Gateway]
        NAT[NAT Gateway]
      end
      subgraph APP["Private application subnets · two AZs"]
        VpcLink[VPC Link]
        Discovery[Cloud Map<br/>private service discovery]
        ECS[ECS Fargate<br/>Apollo GraphQL]
        CrudLambda[SAM CRUD Lambdas]
        Publisher[Task event publisher Lambda]
        WsLambda[WebSocket Lambdas<br/>connect · message · disconnect]
        Migration[One-off Fargate<br/>Prisma migration task]
      end
      subgraph DBTIER["Private database subnets · two AZs"]
        RDS[(RDS PostgreSQL<br/>not publicly accessible)]
      end
    end

    subgraph AWS_MANAGED["AWS-managed data, security, and operations"]
      Dynamo[(DynamoDB<br/>WebSocket connection state)]
      Secret[Secrets Manager<br/>RDS-managed credential · KMS encrypted]
      CloudWatch[CloudWatch<br/>logs · metrics · alarms · dashboard]
      SNS[SNS alerts]
      ECR[Amazon ECR<br/>immutable image tags]
      CFN[CloudFormation<br/>SAM stack]
      DeployRole[GitHub OIDC<br/>dev deployment role]
      CfnRole[CloudFormation execution role]
    end
  end

  subgraph DELIVERY["Source and infrastructure delivery"]
    GitHub[GitHub Actions<br/>PR validation · main deploys dev]
    Terraform[Terraform<br/>reviewed infrastructure plans]
  end

  Browser --> React
  React -->|static app · HTTPS| Amplify
  React -->|sign in| Cognito
  React -->|GraphQL · HTTPS + JWT| HttpApi
  HttpApi --> VpcLink --> Discovery --> ECS
  ECS -->|InvokeFunction| CrudLambda
  ECS -->|readiness query · TLS| RDS
  CrudLambda -->|Prisma · TLS| RDS
  React <-->|GraphQL subscription messages · WSS| WsApi
  WsApi -->|route events| WsLambda
  WsLambda <-->|connection and subscription records| Dynamo
  CrudLambda -. successful mutation invokes .-> Publisher
  Publisher <-->|find authorized subscriptions| Dynamo
  Publisher -->|ManageConnections| WsApi
  RDS -. creates and manages master credential .-> Secret
  ECS -. GetSecretValue by ARN .-> Secret
  CrudLambda -. GetSecretValue by ARN .-> Secret
  Migration -->|Prisma migrate deploy · TLS| RDS
  ECS --> CloudWatch
  CrudLambda --> CloudWatch
  Publisher --> CloudWatch
  WsLambda --> CloudWatch
  Migration --> CloudWatch
  RDS --> CloudWatch
  HttpApi --> CloudWatch
  IGW --> NAT
  NAT -. private subnet egress .-> ECS
  CloudWatch --> SNS
  GitHub -->|temporary OIDC credentials| DeployRole
  DeployRole -->|push image| ECR
  ECR -->|image pull| ECS
  ECR -->|migration image| Migration
  DeployRole -->|SAM deploy| CfnRole --> CFN
  CFN --> CrudLambda
  CFN --> Publisher
  CFN --> WsLambda
  DeployRole -->|register task · update service| ECS
  DeployRole -->|upload frontend build| Amplify
  Terraform -. provisions and configures .-> AWS
```

The diagram separates the runtime request/data paths from the CI/CD control plane. Solid arrows show request, event, or data flow; dashed arrows show configuration, credential-management, or deployment relationships. GitHub Actions deploys the application; Terraform is used separately to provision and update infrastructure after a reviewed plan.

## Deployment pipeline

```mermaid
flowchart LR
  Operator[Infrastructure change reviewed]
  Terraform[Terraform plan and apply]
  Foundation[Provision VPC · IAM · RDS · ECS<br/>API Gateway · alarms · Amplify]
  Operator --> Terraform --> Foundation

  PR[Pull request] --> Checks[Lint · typecheck<br/>tests · build]
  Push[Push to main] --> Checks
  Checks -->|pull request| NoDeploy[Validation only<br/>no AWS credentials]
  Checks -->|main branch only| OIDC[Assume dev AWS role<br/>with GitHub OIDC]
  OIDC --> Build[Build SAM artifacts<br/>and immutable ECS image]
  Build --> ECR[Push image to ECR]
  ECR --> Migrate[Run private Fargate<br/>migration task]
  Migrate --> SAM[Deploy SAM stack<br/>with CloudFormation]
  SAM --> ECS[Update ECS service<br/>wait for stable rollout]
  ECS --> Frontend[Build and deploy<br/>React app to Amplify]
  Frontend --> Verify[Wait for Amplify success]
  Migrate -. failure stops workflow .-> Stop[Deployment fails]
  SAM -. failure stops workflow .-> Stop
  ECS -. failure / circuit breaker .-> Stop
  Frontend -. failure stops workflow .-> Stop
```

Terraform infrastructure changes are applied separately after plan review; the application deployment workflow does not run Terraform. Only the `main` branch deploy job assumes AWS credentials, and it targets the `dev` GitHub Environment. Pull requests run validation only. The migration task runs before SAM and ECS application updates; a migration failure stops deployment.

## Request and event flow

1. Amplify serves the React single-page application over HTTPS. Its managed hosting CDN serves static assets; hashed assets use long-lived cache headers and `index.html` is revalidated.
2. The browser signs in with Cognito. It sends its JWT to the API Gateway HTTP API, whose JWT authorizer validates the request before forwarding it through a VPC Link to Cloud Map and the private ECS service.
3. Apollo GraphQL applies application-level authorization and invokes the relevant SAM-managed Lambda operation using its ECS task role. The Lambda performs the database operation with Prisma. ECS also connects to PostgreSQL for its readiness check.
4. For subscriptions, the browser connects to API Gateway WebSocket over WSS. The message Lambda validates the token during `connection_init` and persists connection/subscription state in DynamoDB. A successful mutation invokes the publisher Lambda, which sends protocol messages using the API Gateway Management API to authorized connections.
5. RDS manages the database credential in Secrets Manager. ECS and Lambda receive the secret ARN as configuration and fetch the value at runtime using IAM roles. The secret value is not passed through GitHub Actions.
6. CloudWatch collects service logs and metrics; configured alarms notify the SNS topic.

## Network and security boundaries

- VPC contains public edge/NAT subnets, private application subnets, and private database subnets across two Availability Zones.
- API Gateway is the public HTTPS entry point. ECS tasks have no public IP. RDS is configured as not publicly accessible.
- Security groups limit database access to application workloads. Lambda and ECS roles have separate permissions; secret read access is scoped to the RDS-managed secret ARN.
- GitHub Actions obtains temporary AWS credentials through OIDC. The deploy job is limited to the `dev` GitHub Environment and the trusted `main` branch.

## CI/CD and ownership boundaries

- GitHub Actions validates pull requests and deploys from `main` to **development only**. There is no production deployment workflow.
- Deployment builds Lambda artifacts and the ECS image, runs migrations as a private one-off ECS task, deploys SAM, updates ECS and waits for service stability, then builds and deploys the frontend to Amplify.
- Terraform owns the VPC/network, IAM foundations, ECS/RDS, API Gateway HTTP ingress, Amplify, alarms, dashboard, and SNS topic. SAM/CloudFormation owns Lambda and WebSocket resources. Do not manage the same resource in both tools.

## Verified behavior and known limits

- ECS rollback is enabled through the deployment circuit breaker and was exercised with an intentionally missing image; ECS returned to a healthy task definition. Current dev service is healthy.
- Failed SAM/CloudFormation updates roll back as part of stack deployment. Lambda aliases for instant rollback are not configured.
- A successful but faulty Lambda or frontend release requires a manual source revert and redeployment. Automated Lambda alias promotion and frontend artifact restoration are not configured.
- Dev is cost-conscious, not production highly available: the current service has one desired ECS task and RDS is not configured as a production Multi-AZ deployment. Production deployment is out of scope.
- CloudWatch alarms and the dashboard are deployed; recent dev verification showed alarms in `OK`. Missing datapoints are treated as non-breaching for low-traffic API/Lambda alarms.

See [deployment](./deployment.md), [CI/CD](./ci-cd.md), [security](./security.md), [database](./database.md), [monitoring](./monitoring.md), and [rollback](./rollback.md) for operational details and commands.
