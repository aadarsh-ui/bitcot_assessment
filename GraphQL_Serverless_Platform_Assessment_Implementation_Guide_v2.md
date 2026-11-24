# GraphQL-Based Serverless Architecture with RDS Integration

## Complete Assessment Implementation Guide --- Terraform + AWS SAM + GitHub Actions

**Assessment:** DevOps Profile Assessment\
**Project:** Setup and Deploy a GraphQL-Based Serverless Architecture
with RDS Integration\
**Cloud:** AWS\
**Default region:** `ap-south-1` (Mumbai)\
**Database:** Amazon RDS for PostgreSQL\
**Infrastructure as Code:** Terraform\
**Lambda packaging/deployment:** AWS SAM\
**Container platform:** Amazon ECS on AWS Fargate\
**Frontend hosting:** Amazon S3 + CloudFront\
**CI/CD:** GitHub Actions using GitHub OIDC\
**Document purpose:** Build instructions, implementation plan,
verification guide, and assessment traceability.

> **Important status statement:** This document is an implementation
> guide. It does not mean that the application, AWS resources,
> pipelines, alarms, or rollback mechanisms have already been created.
> Mark a requirement complete only after implementing it and capturing
> the evidence described here.

------------------------------------------------------------------------

# 1. How to use this guide

Follow the phases in order. Do not create all AWS resources at once.
Build and test locally first, then provision the minimum viable AWS
environment, then add hardening and scaling.

For every phase: 1. Create the files in the stated paths. 2. Use the
commands in order. 3. Check the expected result. 4. Commit working
changes. 5. Save screenshots, command output, workflow links, and AWS
resource identifiers as evidence. 6. Update the assessment tracker in
Section 21.

## 1.1 Decisions and ownership

  -----------------------------------------------------------------------
  Area                                Decision
  ----------------------------------- -----------------------------------
  Infrastructure                      Terraform manages shared AWS
                                      infrastructure

  Lambda application                  AWS SAM manages Lambda functions
                                      and their deployment

  ECS application                     Terraform manages ECS service
                                      infrastructure; GitHub Actions
                                      updates task-definition revisions

  Frontend                            React + TypeScript, S3 private
                                      bucket, CloudFront

  GraphQL                             Apollo Server on ECS Fargate

  Lambda runtime                      Node.js 22.x + TypeScript

  Database                            RDS PostgreSQL

  ORM/migrations                      Prisma

  Database connectivity               ECS GraphQL service and Lambda
                                      functions both connect to RDS
                                      through RDS Proxy

  GraphQL queries/mutations           ECS GraphQL resolvers invoke the
                                      corresponding Lambda functions

  Subscriptions                       GraphQL-over-WebSocket endpoint;
                                      subscription events are published
                                      by Lambda and delivered through a
                                      durable connection/event layer

  CI/CD authentication                GitHub OIDC; no long-lived AWS
                                      access keys

  Environment                         Start with `dev`; production
                                      settings are a separate
                                      configuration

  Region                              `ap-south-1`; CloudFront viewer
                                      certificate must be in `us-east-1`
  -----------------------------------------------------------------------

**Why Terraform and SAM are both used:** the assessment explicitly asks
for SAM or Serverless Framework to configure, deploy, and manage Lambda
functions. Terraform is our additional engineering choice for VPC,
networking, RDS, ECS, CloudFront, IAM foundations, and monitoring. Do
not manage the same Lambda function in both Terraform and SAM.

## 1.2 Cost warning before starting

The following can incur ongoing charges even when the application has
little traffic: NAT Gateway, Application Load Balancer, ECS Fargate
tasks, RDS, RDS Proxy, CloudWatch logs/metrics, VPC interface endpoints,
public IPv4 addresses, Route 53 hosted zones, and data transfer.

For the first demonstrable environment: - Use one ECS task and a small
single-AZ RDS instance. - Keep log retention short (for example, 7
days). - Use a small, controlled test window. - Do not enable read
replicas, WAF, Multi-AZ database, or multiple NAT Gateways unless
required for the demonstration or explicitly budgeted. - Evaluate NAT
Gateway versus VPC endpoints; endpoints also have hourly charges. - RDS
Proxy adds cost. It is useful for Lambda connection management, but
include it only after checking the current regional price and the
expected connection pattern. - Configure an AWS Budget and billing alert
before provisioning. - Destroy disposable development resources when
evidence has been captured. Retain only what is required for the
assessment review.

Do not rely on an estimate from this document as a quote. Check current
AWS pricing for `ap-south-1` before applying Terraform.

------------------------------------------------------------------------

# 2. Assessment requirement traceability

This table reproduces the substance of the supplied assessment and maps
each instruction to the implementation in this guide. The final column
is a completion test, not an assumption that the work is already done.

  --------------------------------------------------------------------------------------------------
  Assessment            What we will create         Guide sections    Completion evidence
  instruction                                                         
  --------------------- --------------------------- ----------------- ------------------------------
  React frontend        React + TypeScript + Apollo 5, 12             UI loads tasks and completes
  interacting with      Client                                        CRUD through GraphQL
  GraphQL API                                                         

  Deploy React app on   Private S3 origin,          7, 10, 12         S3 public access blocked;
  AWS with cost         CloudFront OAC, cache                         CloudFront serves HTTPS; cache
  optimization,         policies, HTTPS                               headers verified
  caching, access       certificate, restricted                       
  control, SSL          bucket policy                                 

  Multiple              Separate query/mutation     6, 8              SAM stack has multiple
  TypeScript/Node.js    handlers and subscription                     functions; invoke/test each
  Lambda functions for  event publisher/connection                    function
  GraphQL queries,      handlers                                      
  mutations,                                                          
  subscriptions                                                       

  Use SAM or Serverless `lambdas/template.yaml`,    6, 15             `sam validate`, `sam build`,
  Framework to          SAM config and SAM deploy                     successful `sam deploy`
  configure, deploy,    workflow                                      
  manage Lambda                                                       

  Private GraphQL       Apollo Server container in  7, 9              ECS task has no public IP;
  server on ECS Fargate private application                           target is healthy; API is
                        subnets; controlled HTTPS                     reachable only through
                        ingress                                       approved ingress

  Secure/scalable       Task execution role, task   7, 9, 17          IAM policy review and ECS
  GraphQL server with   role, least-privilege                         scale test
  IAM best practices    invoke/secret permissions,                    
                        ECS autoscaling                               

  RDS PostgreSQL or     Encrypted RDS PostgreSQL,   7, 11             `Publicly accessible=false`;
  MySQL in private      private DB subnet group,                      connection succeeds only from
  subnet                restrictive SG                                approved app paths

  Connect Lambda and    Both Lambda SG and ECS SG   7, 8, 11          Separate ECS and Lambda DB
  private GraphQL       can reach RDS Proxy; both                     connection tests
  server to RDS         use DB connection                             
                        configuration                                 

  Integrate Lambda,     GraphQL resolvers invoke    8, 12             Trace a GraphQL query and
  GraphQL and RDS for   Lambda; Lambda performs                       mutation through resolver →
  query/mutation        database operations; ECS                      Lambda → RDS; separately
                        also has direct DB                            verify ECS → RDS
                        repository path for                           
                        operations/health where                       
                        appropriate                                   

  GitHub Actions CI/CD  PR checks, Terraform        15                Successful workflow runs and
  for serverless        plan/apply, SAM deploy, ECS                   protected environment
  architecture          deploy, frontend deploy                       configuration

  Automate frontend and CI gates, tests, scans,     15, 16            Failed test blocks deploy;
  backend deployments   approval gate, smoke tests                    production requires approval
  with                                                                
  testing/validation                                                  
  before production                                                   

  CloudWatch Logs and   Explicit log groups,        18                Logs and metrics visible for
  Metrics for Lambda,   metrics, dashboard                            all three
  ECS, RDS                                                            

  CloudWatch alarms for Lambda, ALB/ECS, RDS alarms 18                Trigger test alarm and receive
  errors, latency,      and SNS notification                          notification
  invocations, DB                                                     
  connections                                                         

  IAM roles/policies    Separate                    7, 9, 15          Trust policies and permissions
  for Lambda, ECS, RDS  execution/task/deployment                     reviewed; no broad wildcard
  access, CI/CD         roles; RDS network                            permissions without
                        auth/secret access; GitHub                    justification
                        OIDC role                                     

  Secure API keys,      Secrets Manager + KMS, no   7, 11, 15         Secret value absent from Git,
  tokens, secrets       secrets in source or image                    image, Terraform outputs and
                                                                      logs

  Secrets Manager       Secret references at        11, 15            Runtime fetch succeeds;
  environment variable  runtime; GitHub OIDC and                      workflow logs do not expose
  management and GitHub protected GitHub                              secrets
  Actions integration   environment; deploy config                    
                        contains ARNs, not secret                     
                        values                                        

  Scaling for ECS       ECS Application Auto        17                ECS policy test; Lambda
  Fargate, Lambda, RDS  Scaling; Lambda concurrency                   concurrency configuration;
                        controls/automatic                            documented RDS scaling
                        concurrency; RDS                              decision
                        vertical/storage scaling                      
                        and optional read replica                     

  Cost-effective        Start without read replica; 17, 20            Explain decision using
  scaling and read      add only after measured                       metrics; no unnecessary
  replicas if required  read load                                     replica

  Rollback using        SAM-managed Lambda          19                Deliberate failed deployment
  Serverless Framework  versions/aliases and                          or rollback drill succeeds
  and GitHub Actions    CodeDeploy alarms; ECS                        
                        circuit breaker/previous                      
                        task definition; frontend                     
                        release artifact restore                      

  Automated rollback to ECS rollback, Lambda        15, 19            Recorded rollback exercise and
  previous stable       traffic-shift rollback,                       stable version identifier
  version               frontend prior artifact                       
                        restore; workflow stops                       
                        promotion on failed smoke                     
                        test                                          

  Architecture diagram  Architecture diagram in     3                 Diagram included in repository
  showing React,        Section 3                                     and submission
  Lambda, ECS, RDS,                                                   
  CloudWatch, Secrets                                                 
  Manager, CI/CD                                                      

  Documentation:        This guide plus generated   All; especially   Repository docs and evidence
  deploy/test,          runbooks in `docs/`         14--21            checklist complete
  IAM/security, CI/CD,                                                
  DB/security,                                                        
  monitoring/rollback                                                 
  --------------------------------------------------------------------------------------------------

## 2.1 Important interpretation: "private GraphQL server"

The ECS tasks must run in private subnets and must not have public IP
addresses. A browser cannot directly reach a private IP. Therefore,
expose a controlled HTTPS ingress endpoint (for example, an
internet-facing ALB or CloudFront-to-ALB origin) while keeping the
GraphQL container tasks private. Restrict ingress, require
authentication, use TLS, and do not expose the database. In the
architecture and report, describe the **GraphQL compute service** as
private and the **ingress layer** as the controlled public entry point.
If the assessor interprets "private GraphQL server" as internal-only
with VPN access, confirm that before implementation because a public
browser frontend would then need a different access path.

------------------------------------------------------------------------

# 3. Target architecture

``` mermaid
flowchart TB
  U[User Browser] -->|HTTPS| CF[CloudFront]
  CF -->|Private origin access| S3[(Private S3 React assets)]
  U -->|HTTPS GraphQL request| IN[Controlled HTTPS ingress / ALB]
  IN --> ECS[ECS Fargate Apollo GraphQL tasks<br/>Private application subnets]
  ECS -->|InvokeFunction IAM permission| LQ[Query and mutation Lambdas]
  LQ -->|TLS PostgreSQL| RP[RDS Proxy]
  ECS -->|TLS PostgreSQL direct service path| RP
  RP --> DB[(RDS PostgreSQL<br/>Private DB subnets)]
  LQ --> EVT[Subscription event publisher]
  EVT --> WS[GraphQL WebSocket delivery service]
  WS -->|WSS| U
  GH[GitHub] --> GHA[GitHub Actions]
  GHA -->|OIDC assume role| IAM[Deployment IAM role]
  IAM --> TF[Terraform infrastructure]
  IAM --> SAM[AWS SAM Lambda deployment]
  IAM --> ECR[ECR image repository]
  ECR --> ECS
  GHA -->|Upload build| S3
  CW[CloudWatch Logs, Metrics, Alarms] --- ECS
  CW --- LQ
  CW --- DB
  SM[Secrets Manager + KMS] --> ECS
  SM --> LQ
  SNS[SNS alerts] <-- CW
```

## 3.1 Request flows

**Query/mutation flow** 1. Browser sends a GraphQL request over HTTPS.
2. Controlled ingress forwards it to a healthy private ECS Fargate task.
3. Apollo resolver validates the request and derives the authenticated
identity from verified claims. 4. Resolver invokes the corresponding
Lambda function using the ECS task role. 5. Lambda validates the event
and uses the shared repository/service code. 6. Lambda connects to
PostgreSQL through RDS Proxy using its own IAM role and secret
permissions. 7. The result returns to the resolver and then to the
browser. 8. ECS also has an explicit direct RDS Proxy connection path.
Implement a narrowly scoped server-side operation such as
readiness/database health check or a dedicated read operation to
demonstrate this connection. Do not route every database operation
exclusively through Lambda and then claim the ECS server itself connects
to RDS.

**Subscription flow** 1. Browser opens a secure WebSocket connection
using the GraphQL WebSocket protocol (`graphql-transport-ws`). 2. The
subscription service validates the connection and subscription
operation. 3. A successful mutation causes the event publisher Lambda to
publish a task event. 4. The subscription delivery component sends the
event to authorized active subscribers. 5. The browser receives the
GraphQL subscription payload.

**CI/CD flow** 1. Pull request runs lint, typecheck, unit tests,
integration tests where configured, dependency checks, SAM validation,
and Terraform plan. 2. Merge to the protected deployment branch triggers
deployment to dev. 3. GitHub Actions authenticates through OIDC. 4.
Terraform changes require a reviewed plan; SAM deploys Lambda; container
image is built/scanned/pushed and ECS service updated; React assets are
uploaded and CloudFront cache is invalidated. 5. Smoke tests run. 6.
Production promotion requires an approval gate. 7. Failed deployment
gates stop promotion and invoke the configured rollback mechanism.

------------------------------------------------------------------------

# 4. Repository structure

Create the repository with this target structure. Add files as their
phase begins; do not create empty placeholder files and call them
implemented.

``` text
graphql-serverless-platform/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── graphql/
│   │   └── components/
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── schema.ts
│   │   ├── resolvers.ts
│   │   ├── auth.ts
│   │   └── db.ts
│   ├── Dockerfile
│   └── package.json
├── lambdas/
│   ├── src/
│   │   ├── get-tasks/
│   │   ├── get-task/
│   │   ├── create-task/
│   │   ├── update-task/
│   │   ├── delete-task/
│   │   ├── publish-task-event/
│   │   └── websocket/
│   ├── template.yaml
│   └── samconfig.toml
├── packages/core/
│   ├── src/
│   └── package.json
├── database/prisma/
│   ├── schema.prisma
│   └── migrations/
├── infrastructure/terraform/
│   ├── bootstrap/
│   ├── modules/
│   │   ├── networking/
│   │   ├── security/
│   │   ├── database/
│   │   ├── ecs/
│   │   ├── frontend/
│   │   ├── iam/
│   │   └── monitoring/
│   └── environments/
│       ├── dev/
│       └── prod/
├── .github/workflows/
│   ├── pull-request.yml
│   ├── terraform-plan.yml
│   ├── deploy-dev.yml
│   └── deploy-prod.yml
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   ├── security.md
│   ├── database.md
│   ├── ci-cd.md
│   ├── monitoring.md
│   ├── rollback.md
│   └── evidence/
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

------------------------------------------------------------------------

# 5. Local workstation and application setup

## 5.1 Install prerequisites

Install: - Git - Node.js 22 LTS (use a currently supported LTS
compatible with project dependencies) - npm - Docker Desktop with Docker
Compose - VS Code - AWS CLI v2 - Terraform - AWS SAM CLI

Verify:

``` powershell
node --version
npm --version
git --version
docker --version
docker compose version
aws --version
terraform version
sam --version
```

Configure AWS CLI only after creating/choosing an AWS account and
setting a billing budget. Use a named profile for local development; do
not commit credentials.

``` powershell
aws configure --profile graphql-dev
aws sts get-caller-identity --profile graphql-dev
aws configure get region --profile graphql-dev
```

Set the region:

``` powershell
$env:AWS_PROFILE="graphql-dev"
$env:AWS_REGION="ap-south-1"
```

## 5.2 Create the repository

``` powershell
mkdir graphql-serverless-platform
cd graphql-serverless-platform
git init
npm init -y
```

Replace the root `package.json` with:

``` json
{
  "name": "graphql-serverless-platform",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["frontend", "backend", "lambdas", "packages/core"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  }
}
```

Create `.gitignore`:

``` gitignore
node_modules/
dist/
build/
coverage/
.env
.env.*
!.env.example
.aws-sam/
.terraform/
*.tfstate
*.tfstate.*
*.tfplan
terraform.tfvars
*.pem
*.key
.DS_Store
.vscode/
```

Create folders:

``` powershell
mkdir frontend,backend,lambdas,database,packages,infrastructure,docs,.github
mkdir packages\core
mkdir database\prisma
mkdir infrastructure\terraform
mkdir .github\workflows
```

## 5.3 Local PostgreSQL

Create `.env` locally (never commit it):

``` dotenv
POSTGRES_DB=task_platform
POSTGRES_USER=task_app
POSTGRES_PASSWORD=change_this_local_only
DATABASE_URL=postgresql://task_app:change_this_local_only@localhost:5432/task_platform
```

Create `docker-compose.yml`:

``` yaml
services:
  postgres:
    image: postgres:16
    container_name: task-platform-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  postgres_data:
```

Start and verify:

``` powershell
docker compose up -d
docker compose ps
docker compose logs postgres
```

Expected: container is `healthy`; PostgreSQL is listening only on local
loopback. Stop it with `docker compose down`. Use
`docker compose down -v` only when intentionally deleting local data.

## 5.4 Data model and Prisma

Install Prisma in the backend/database workspace as appropriate for the
chosen monorepo layout:

``` powershell
npm install prisma @prisma/client
npx prisma init
```

Use this starting `database/prisma/schema.prisma` (adjust the Prisma
schema path in scripts/configuration to match the actual workspace):

``` prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  COMPLETED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  tasks     Task[]
}

model Task {
  id          String       @id @default(uuid()) @db.Uuid
  title       String       @db.VarChar(200)
  description String?
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  dueDate     DateTime?
  userId      String       @db.Uuid
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([userId])
  @@index([userId, status, createdAt])
}
```

Set `DATABASE_URL` in the local environment and run:

``` powershell
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio
```

Commit migration files. For deployed environments use
`prisma migrate deploy`, never `migrate dev`.

## 5.5 Shared application logic

Keep domain logic in `packages/core`; keep transport-specific code in
the GraphQL server and Lambda handlers. This prevents two
implementations of task rules.

Implement these interfaces: - `TaskRepository`: `listByUser`,
`findByIdForUser`, `create`, `update`, `delete`. - `TaskService`:
validate input, enforce ownership, call repository. -
`TaskEventPublisher`: publish created/updated/deleted events.

Do not accept a `userId` from browser input as proof of identity. The
user ID must be derived from a verified JWT claim and passed through
trusted server context/event fields.

## 5.6 GraphQL schema

Create `backend/src/schema.ts`:

``` ts
import { gql } from "graphql-tag";

export const typeDefs = gql`
  enum TaskStatus {
    TODO
    IN_PROGRESS
    COMPLETED
  }

  enum TaskPriority {
    LOW
    MEDIUM
    HIGH
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: TaskPriority!
    dueDate: String
    createdAt: String!
    updatedAt: String!
  }

  input CreateTaskInput {
    title: String!
    description: String
    priority: TaskPriority
    dueDate: String
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: TaskStatus
    priority: TaskPriority
    dueDate: String
  }

  type Query {
    getTasks: [Task!]!
    getTaskById(id: ID!): Task
    databaseHealth: Boolean!
  }

  type Mutation {
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }

  type Subscription {
    taskChanged: Task!
  }
`;
```

This is the API contract. Implement all resolvers and tests; a schema
alone is not a working GraphQL API.

## 5.7 GraphQL resolver responsibilities

Implement resolver behavior as follows:

  -----------------------------------------------------------------------
  Resolver                            Implementation
  ----------------------------------- -----------------------------------
  `getTasks`                          Invoke `get-tasks` Lambda with
                                      verified identity

  `getTaskById`                       Invoke `get-task` Lambda

  `createTask`                        Invoke `create-task` Lambda;
                                      publish event after successful
                                      transaction

  `updateTask`                        Invoke `update-task` Lambda;
                                      publish event after successful
                                      transaction

  `deleteTask`                        Invoke `delete-task` Lambda;
                                      publish event after successful
                                      delete

  `databaseHealth`                    ECS server uses its direct
                                      Prisma/RDS Proxy repository
                                      connection; do not implement this
                                      by invoking Lambda

  `taskChanged`                       Subscribe to the implemented
                                      GraphQL-over-WebSocket event source
  -----------------------------------------------------------------------

The resolver-to-Lambda calls use AWS SDK v3 `LambdaClient` and
`InvokeCommand`. The ECS task role must have `lambda:InvokeFunction`
only for the specific function ARNs it calls. Lambda handlers must
return a documented JSON payload and safe error structure.

## 5.8 React frontend

Create the React application with Vite:

``` powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install @apollo/client graphql
npm run dev
```

Configure Apollo Client with: - HTTP link for GraphQL queries and
mutations. - WebSocket link for subscriptions once the
`graphql-transport-ws` endpoint is implemented. - Authentication token
handling that does not expose client secrets. - `VITE_GRAPHQL_HTTP_URL`
and `VITE_GRAPHQL_WS_URL` as public endpoint configuration only.

Build the UI: 1. Task list with loading/empty/error states. 2. Create
task form. 3. Edit task form. 4. Delete confirmation. 5. Status and
priority display. 6. Live update indicator when subscription messages
arrive.

Test all CRUD operations against the local GraphQL service before AWS
deployment.

------------------------------------------------------------------------

# 6. Lambda functions and AWS SAM

## 6.1 Required functions

Create multiple independently deployable Lambda handlers:

  -----------------------------------------------------------------------------------
  Function                     Operation               Database use
  ---------------------------- ----------------------- ------------------------------
  `GetTasksFunction`           GraphQL query           Reads authorized tasks

  `GetTaskFunction`            GraphQL query           Reads one authorized task

  `CreateTaskFunction`         GraphQL mutation        Inserts task

  `UpdateTaskFunction`         GraphQL mutation        Updates task

  `DeleteTaskFunction`         GraphQL mutation        Deletes task

  `PublishTaskEventFunction`   Subscription event      Publishes successful task
                               publisher               events

  `WsConnectFunction`          WebSocket connection    Authenticates/registers
                                                       connection

  `WsDisconnectFunction`       WebSocket disconnect    Removes connection

  `WsMessageFunction`          WebSocket protocol      Handles
                               message                 init/subscribe/complete/ping
                                                       protocol messages
  -----------------------------------------------------------------------------------

The five CRUD functions satisfy multiple query/mutation handlers. The
event and WebSocket functions implement subscription delivery. The final
deployed system must support the GraphQL subscription protocol; a custom
JSON WebSocket message by itself is not enough to claim GraphQL
subscriptions.

## 6.2 Lambda handler contract

Every handler must: 1. Validate the incoming event. 2. Read the verified
identity injected by the trusted GraphQL server or authentication layer.
3. Call shared task service/repository code. 4. Use RDS Proxy and TLS.
5. Reuse initialized clients across warm invocations where safe. 6. Log
request ID, operation, duration, and safe error code. 7. Never log
passwords, tokens, raw authorization headers, or full sensitive
payloads.

Example handler shape (`lambdas/src/get-tasks/handler.ts`):

``` ts
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { listTasksForUser } from "@platform/core";

export const handler = async (
  event: { userId: string; requestId?: string },
  context: Context
) => {
  if (!event.userId) {
    throw new Error("UNAUTHENTICATED");
  }

  const tasks = await listTasksForUser(event.userId);

  console.log(JSON.stringify({
    level: "INFO",
    operation: "getTasks",
    awsRequestId: context.awsRequestId,
    count: tasks.length
  }));

  return { tasks };
};
```

This is the handler contract example. Adapt imports and event types to
the actual workspace build. Do not trust `userId` if it originated from
an untrusted browser field; only the authenticated GraphQL server may
pass it after JWT verification.

## 6.3 SAM template

Create `lambdas/template.yaml`. This is a starting deployment template;
add the remaining CRUD functions using the same pattern and replace all
parameter placeholders with real stack outputs/ARNs. Do not deploy a
template that still contains placeholder values.

``` yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31
Description: GraphQL task operation Lambda functions

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, prod]
  PrivateSubnetA:
    Type: AWS::EC2::Subnet::Id
  PrivateSubnetB:
    Type: AWS::EC2::Subnet::Id
  LambdaSecurityGroup:
    Type: AWS::EC2::SecurityGroup::Id
  DatabaseSecretArn:
    Type: String
  DatabaseProxyEndpoint:
    Type: String

Globals:
  Function:
    Runtime: nodejs22.x
    Architectures: [arm64]
    Timeout: 15
    MemorySize: 256
    Tracing: Active
    VpcConfig:
      SubnetIds:
        - !Ref PrivateSubnetA
        - !Ref PrivateSubnetB
      SecurityGroupIds:
        - !Ref LambdaSecurityGroup
    Environment:
      Variables:
        NODE_ENV: production
        DB_HOST: !Ref DatabaseProxyEndpoint
        DB_SECRET_ARN: !Ref DatabaseSecretArn
        DB_PORT: "5432"
    Tags:
      Project: graphql-serverless-platform
      Environment: !Ref Environment

Resources:
  GetTasksFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-get-tasks"
      CodeUri: .
      Handler: dist/get-tasks/handler.handler
      Policies:
        - AWSSecretsManagerGetSecretValuePolicy:
            SecretArn: !Ref DatabaseSecretArn
      ReservedConcurrentExecutions: 10

  GetTaskFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-get-task"
      CodeUri: .
      Handler: dist/get-task/handler.handler
      Policies:
        - AWSSecretsManagerGetSecretValuePolicy:
            SecretArn: !Ref DatabaseSecretArn
      ReservedConcurrentExecutions: 10

  CreateTaskFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-create-task"
      CodeUri: .
      Handler: dist/create-task/handler.handler
      Policies:
        - AWSSecretsManagerGetSecretValuePolicy:
            SecretArn: !Ref DatabaseSecretArn
      ReservedConcurrentExecutions: 5

  UpdateTaskFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-update-task"
      CodeUri: .
      Handler: dist/update-task/handler.handler
      Policies:
        - AWSSecretsManagerGetSecretValuePolicy:
            SecretArn: !Ref DatabaseSecretArn
      ReservedConcurrentExecutions: 5

  DeleteTaskFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-delete-task"
      CodeUri: .
      Handler: dist/delete-task/handler.handler
      Policies:
        - AWSSecretsManagerGetSecretValuePolicy:
            SecretArn: !Ref DatabaseSecretArn
      ReservedConcurrentExecutions: 3

  PublishTaskEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "${Environment}-graphql-publish-task-event"
      CodeUri: .
      Handler: dist/publish-task-event/handler.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Sub "${Environment}-graphql-connections"
      ReservedConcurrentExecutions: 5

Outputs:
  GetTasksFunctionArn:
    Value: !GetAtt GetTasksFunction.Arn
  GetTaskFunctionArn:
    Value: !GetAtt GetTaskFunction.Arn
  CreateTaskFunctionArn:
    Value: !GetAtt CreateTaskFunction.Arn
  UpdateTaskFunctionArn:
    Value: !GetAtt UpdateTaskFunction.Arn
  DeleteTaskFunctionArn:
    Value: !GetAtt DeleteTaskFunction.Arn
```

**Important SAM follow-up work:** add the WebSocket functions,
connection table, WebSocket API routes, API deployment/stage,
permissions, and the actual GraphQL-over-WebSocket protocol state
machine. If Terraform owns the API Gateway/DynamoDB resources, remove
them from SAM and pass their identifiers into the SAM stack. One tool
must own each resource.

## 6.4 Build and deploy SAM

From the Lambda project directory:

``` powershell
sam validate --lint --template-file template.yaml
sam build --template-file template.yaml
sam deploy --guided
```

Use environment-specific configuration in `samconfig.toml`; do not put
secret values in it. Store parameter values such as subnet IDs, security
group IDs, secret ARN, and proxy endpoint as non-secret deployment
configuration. For repeatable deployment, use:

``` powershell
sam build
sam deploy --config-env dev
```

Verify:

``` powershell
aws lambda list-functions --region ap-south-1
aws lambda get-function --function-name dev-graphql-get-tasks --region ap-south-1
```

Invoke a function with a test event that contains a trusted test
identity:

``` powershell
aws lambda invoke `
  --function-name dev-graphql-get-tasks `
  --payload fileb://events/get-tasks.json `
  --cli-binary-format raw-in-base64-out `
  response.json
Get-Content response.json
```

Capture the function ARN, runtime, VPC configuration, role, and
successful invocation output.

## 6.5 Lambda-to-RDS connectivity

-   Attach the Lambda functions to private application subnets.
-   Assign a Lambda security group.
-   Allow outbound PostgreSQL TCP 5432 from Lambda SG to RDS Proxy SG.
-   Allow inbound TCP 5432 on the proxy SG from Lambda SG.
-   Allow proxy-to-database TCP 5432 from Proxy SG to RDS SG.
-   Store credentials in Secrets Manager or use supported IAM database
    authentication.
-   Use RDS Proxy to control connection fan-out when justified.
-   Set reserved concurrency to protect database connection capacity.
-   Configure VPC access to required AWS services using NAT or
    appropriate VPC endpoints.

A VPC-attached Lambda may lose default internet access unless egress is
explicitly designed. Do not assume that attaching a Lambda to a private
subnet automatically gives it access to public AWS endpoints.

------------------------------------------------------------------------

# 7. Terraform AWS infrastructure

## 7.1 Infrastructure resources

Terraform should provision: - VPC, public/private application/private
database subnets in two AZs. - Internet Gateway and selected egress
design (NAT or endpoints). - Security groups. - ECR repository and
lifecycle policy. - ECS cluster, task definition/service, ALB, target
group and listener. - RDS PostgreSQL, subnet group, parameter group if
needed, and optional RDS Proxy. - Secrets Manager secret metadata and
KMS key/policies as appropriate. - S3 frontend bucket, CloudFront
distribution, OAC and bucket policy. - IAM roles/policies and GitHub
OIDC trust role. - CloudWatch log groups, alarms, dashboard and SNS
topic.

## 7.2 VPC design

Example CIDR plan:

  Subnet             CIDR               Purpose
  ------------------ ------------------ ------------------
  VPC                `10.20.0.0/16`     Project network
  Public AZ-A        `10.20.0.0/20`     ALB, NAT if used
  Public AZ-B        `10.20.16.0/20`    ALB
  Private app AZ-A   `10.20.128.0/20`   ECS and Lambda
  Private app AZ-B   `10.20.144.0/20`   ECS and Lambda
  Private DB AZ-A    `10.20.32.0/20`    RDS subnet group
  Private DB AZ-B    `10.20.48.0/20`    RDS subnet group

The DB subnets have no direct internet route. ECS tasks and Lambda
functions have no public IP addresses. The ALB is the controlled
ingress. Choose CIDRs that do not overlap with existing connected
networks.

## 7.3 Security group flow

  -----------------------------------------------------------------------
  Security group          Inbound                 Outbound
  ----------------------- ----------------------- -----------------------
  ALB SG                  TCP 443 from approved   GraphQL container port
                          ingress sources         to ECS SG

  ECS SG                  GraphQL port only from  TCP 5432 to Proxy SG;
                          ALB SG                  AWS API egress needed
                                                  for Lambda
                                                  invoke/logs/secrets

  Lambda SG               No unsolicited inbound  TCP 5432 to Proxy SG;
                                                  required AWS API egress

  Proxy SG                TCP 5432 from ECS SG    TCP 5432 to DB SG
                          and Lambda SG           

  RDS SG                  TCP 5432 only from      Stateful response
                          Proxy SG (or explicitly 
                          approved app SG if      
                          proxy is omitted)       
  -----------------------------------------------------------------------

Never allow PostgreSQL from `0.0.0.0/0`.

## 7.4 Terraform project initialization

Create environment files under
`infrastructure/terraform/environments/dev`.

Example `versions.tf`:

``` hcl
terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "REPLACE_WITH_TERRAFORM_STATE_BUCKET"
    key          = "graphql-platform/dev/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "graphql-serverless-platform"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
```

Pin provider versions deliberately and commit `.terraform.lock.hcl`.
Confirm the backend locking option is supported by the Terraform version
you install. Bootstrap the state bucket and state permissions separately
before using the remote backend. Enable bucket versioning, encryption,
public-access block, and least-privilege access.

Example `variables.tf`:

``` hcl
variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "db_name" {
  type    = string
  default = "task_platform"
}
```

Example `terraform.tfvars.example`:

``` hcl
aws_region  = "ap-south-1"
environment = "dev"
vpc_cidr    = "10.20.0.0/16"
db_name     = "task_platform"
```

Copy to `terraform.tfvars` locally and never commit the real file.

## 7.5 Terraform execution sequence

From `infrastructure/terraform/environments/dev`:

``` powershell
terraform fmt -recursive
terraform init
terraform validate
terraform plan -out=tfplan
terraform show tfplan
```

Review the plan carefully for: - RDS instance size and storage. - NAT
Gateways and VPC endpoints. - ALB and public IPv4 costs. - ECS desired
task count. - RDS Proxy. - CloudWatch retention. - Public access and
security group rules. - Any resource replacement or deletion.

Apply only after review:

``` powershell
terraform apply tfplan
```

Save outputs:

``` powershell
terraform output
terraform output -json > outputs.json
```

Do not export secret values as Terraform outputs. Terraform state can
contain sensitive values even when a variable/output is marked
`sensitive`.

## 7.6 ECS Fargate deployment infrastructure

Create: - ECR repository. - ECS cluster. - Task execution role (pull ECR
image, write CloudWatch logs, retrieve task-definition secrets where
configured). - ECS task role (only Lambda invoke and required runtime
access). - Task definition with CPU/memory, container port, health
check, log configuration, non-root user, read-only filesystem where
compatible. - ECS service in private subnets with
`assign_public_ip = false`. - ALB, target group, HTTPS listener and ACM
certificate. - ECS deployment circuit breaker with rollback enabled.

Development can start with one task. A production/high-availability
configuration should generally use at least two tasks across AZs and a
resilient database/network design. Do not describe a one-task dev setup
as highly available.

## 7.7 RDS PostgreSQL infrastructure

Development: - Private DB subnet group across two AZs. -
`publicly_accessible = false`. - Encryption at rest. - Automated backups
with appropriate retention. - Smallest supported instance that can pass
the demo workload. - Single-AZ only if the assessment budget allows this
trade-off. - Credentials in Secrets Manager. - Deletion protection only
disabled for a disposable environment with a documented cleanup plan.

Production: - Multi-AZ for availability. - Deletion protection. - Longer
backup retention and tested point-in-time recovery. - Capacity chosen
from measurements. - RDS Proxy where connection behavior warrants it. -
Read replica only after metrics show read pressure and the
engine/edition supports the required feature.

RDS does not generically auto-scale compute in the same way as Lambda.
Explain RDS scaling accurately: vertical instance resizing, storage
autoscaling where supported/configured, Multi-AZ for availability, and
read replicas for read scaling when justified.

## 7.8 Frontend S3 + CloudFront

Create: - S3 bucket with all public access blocked. - CloudFront Origin
Access Control (OAC). - Bucket policy allowing only the CloudFront
distribution to read. - CloudFront distribution with HTTPS viewer
certificate. - ACM certificate for CloudFront viewer hostname in
`us-east-1`. - Route 53 alias if a domain is available. - Cache policy
for immutable hashed assets and short/no-cache HTML entrypoint. - SPA
routing fallback to `index.html` without masking API errors. -
CloudFront invalidation for `index.html` after deploy.

The S3 bucket must not be made public to make the site work. Test the S3
object URL directly (it should be denied) and the CloudFront URL (it
should load over HTTPS).

## 7.9 Terraform outputs required by deployment

Expose non-secret values: - VPC ID. - Private subnet IDs. - ECS security
group ID. - Lambda security group ID. - RDS Proxy endpoint. - Database
secret ARN (not its value). - ECR repository URL. - ECS cluster/service
names. - ALB DNS name. - S3 bucket name. - CloudFront distribution
ID/domain. - SNS topic ARN. - GitHub deployment role ARN.

------------------------------------------------------------------------

# 8. ECS GraphQL server implementation

## 8.1 Dockerfile

Create `backend/Dockerfile` using a multi-stage build, pinned base image
tag/digest, and non-root runtime. Example structure:

``` dockerfile
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

For a monorepo, ensure the Docker build context includes workspace
packages and the production install includes the compiled shared
package. Test the exact Docker build locally before pushing to ECR.

## 8.2 Server configuration

The GraphQL server must: - Start on the container port configured in the
target group. - Expose `/health` for liveness and a separate readiness
check for database dependency. - Verify JWT issuer, audience, signature
and expiry. - Apply CORS allowlist. - Apply request size, query depth
and complexity limits. - Use structured JSON logs. - Handle SIGTERM and
close HTTP/database connections gracefully. - Use `DATABASE_SECRET_ARN`
or supported secret injection to retrieve DB credentials at runtime. -
Use the ECS task role for Lambda invocation. - Use the direct RDS Proxy
connection path for its own DB health/read operation.

Do not put database passwords in the Docker image, build arguments,
source control, task definition plaintext environment variables, or
Terraform output.

## 8.3 ECS deployment commands

Build and test:

``` powershell
docker build -t graphql-api:local -f backend/Dockerfile .
docker run --rm -p 4000:4000 --env-file .env graphql-api:local
```

After Terraform creates ECR:

``` powershell
aws ecr get-login-password --region ap-south-1 |
  docker login --username AWS --password-stdin REPLACE_ECR_REGISTRY

docker tag graphql-api:local REPLACE_ECR_REPOSITORY:COMMIT_SHA
docker push REPLACE_ECR_REPOSITORY:COMMIT_SHA
```

Register a new task definition revision with the immutable image tag,
update the ECS service, and wait:

``` powershell
aws ecs update-service `
  --cluster REPLACE_CLUSTER `
  --service REPLACE_SERVICE `
  --force-new-deployment `
  --region ap-south-1

aws ecs wait services-stable `
  --cluster REPLACE_CLUSTER `
  --services REPLACE_SERVICE `
  --region ap-south-1
```

For production pipeline use, register a new task definition revision
with the new image digest/tag and update the service to that revision.
Do not rely only on `latest`.

------------------------------------------------------------------------

# 9. Networking and private connectivity validation

Perform these tests before calling the infrastructure complete.

## 9.1 Expected network rules

-   Browser → HTTPS ingress: allowed.
-   Ingress → ECS target port: allowed.
-   Internet → ECS task ENI directly: not allowed.
-   Internet → RDS: not allowed.
-   ECS SG → RDS Proxy SG TCP 5432: allowed.
-   Lambda SG → RDS Proxy SG TCP 5432: allowed.
-   RDS Proxy SG → RDS SG TCP 5432: allowed.
-   Unrelated security groups → RDS: denied.

## 9.2 Verify resources

``` powershell
aws ecs describe-services --cluster REPLACE_CLUSTER --services REPLACE_SERVICE --region ap-south-1
aws rds describe-db-instances --region ap-south-1
aws ec2 describe-security-groups --region ap-south-1
```

Check: - ECS task `assignPublicIp` is disabled. - ECS task is placed in
private subnets. - RDS `PubliclyAccessible` is false. - RDS subnet group
contains private DB subnets. - Database SG does not allow public
CIDRs. - Proxy target is healthy if RDS Proxy is used.

## 9.3 Prove both application paths reach RDS

1.  From the ECS service, run the application readiness/database check
    using its direct DB repository connection. Capture success in logs.
2.  Invoke a Lambda query function that connects to the same RDS
    Proxy/database. Capture successful invocation and logs.
3.  Confirm both use the same intended database and schema.
4.  Confirm the DB security group permits only the expected
    proxy/application security group paths.

This is a critical assessment item. A diagram showing a line from ECS to
RDS is not evidence; capture successful connectivity from the ECS
application itself.

------------------------------------------------------------------------

# 10. Frontend hosting, caching, access control and SSL

## 10.1 Build

``` powershell
cd frontend
npm ci
npm run lint
npm test -- --run
npm run build
```

Use the actual test script configured by the frontend package. A
successful build is not a substitute for functional GraphQL tests.

## 10.2 Upload

After Terraform creates the bucket and CloudFront distribution:

``` powershell
aws s3 sync dist/ s3://REPLACE_FRONTEND_BUCKET/ `
  --delete `
  --cache-control "public,max-age=31536000,immutable"
```

Then upload `index.html` with a short cache lifetime:

``` powershell
aws s3 cp dist/index.html s3://REPLACE_FRONTEND_BUCKET/index.html `
  --cache-control "public,max-age=0,must-revalidate"
```

Invalidate the entrypoint:

``` powershell
aws cloudfront create-invalidation `
  --distribution-id REPLACE_DISTRIBUTION_ID `
  --paths "/index.html"
```

For a mature deployment, apply different cache headers to hashed assets
and HTML rather than assigning the same immutable policy to every file.
Ensure the upload order and cache behavior cannot leave HTML pointing at
missing assets.

## 10.3 Verify frontend security

-   CloudFront URL loads with HTTPS and a valid certificate.
-   HTTP redirects to HTTPS.
-   S3 public access block is enabled.
-   Direct S3 object access is denied.
-   CloudFront can read the private S3 origin through OAC.
-   Hashed assets have long cache lifetime.
-   `index.html` revalidates.
-   CORS allows only the required frontend origin.
-   No secret values appear in built JavaScript bundles.

------------------------------------------------------------------------

# 11. Database, secrets and access control

## 11.1 Secrets Manager

Store: - PostgreSQL username/password or connection secret. - Any
server-side API credentials. - Signing/verification material only when
the chosen auth model requires it.

Do not store: - Secret values in GitHub repository files. - Passwords in
`.tfvars`, committed SAM config, Docker image, React environment
variables, or logs. - Plaintext secret values in Terraform outputs.

Use Secrets Manager references (ARNs) in deployment configuration. Give
the ECS task role and each Lambda role access only to the exact secret
ARN they need. Use KMS key policy and IAM permissions consistently.

## 11.2 Runtime secret retrieval

The application should retrieve the secret at runtime using AWS SDK and
cache it safely for a short period to avoid a Secrets Manager API call
on every request. Handle rotation by refreshing the cache and
reconnecting the pool. Do not print the secret object.

If using ECS task-definition `secrets`, understand that the execution
role needs the relevant permissions. If the application fetches Secrets
Manager directly, the task role needs the permissions. Choose one model
and document it.

## 11.3 IAM role separation

  -----------------------------------------------------------------------
  Role                                Required permissions (examples;
                                      scope to exact resources)
  ----------------------------------- -----------------------------------
  ECS task execution role             ECR image pull, CloudWatch log
                                      write, task-definition secret
                                      injection if used

  ECS task role                       Invoke only required Lambda
                                      function ARNs; read only required
                                      runtime secret

  Query Lambda role                   Read DB secret, VPC ENI permissions
                                      required by Lambda, logs, DB
                                      network path

  Mutation Lambda role                Read DB secret, logs, required
                                      event publisher permission

  Subscription publisher role         Access only subscription
                                      connection/event store and
                                      WebSocket management API

  WebSocket handler role              Access connection registry and
                                      required connection-management API

  GitHub Terraform role               Infrastructure deployment
                                      permissions, scoped by environment

  GitHub application deployment role  ECR push, ECS task/service update,
                                      SAM deployment, S3
                                      upload/CloudFront invalidation as
                                      required
  -----------------------------------------------------------------------

Use separate roles where possible. Avoid `AdministratorAccess` for
runtime roles. GitHub deployment roles are powerful; restrict trust to
the exact repository, branch and environment. Consider separate plan and
apply roles.

## 11.4 Authentication and authorization

The application must not accept a browser-supplied user ID as proof of
identity. Use Cognito or another approved OIDC provider for a real
deployment. Validate JWT signature, issuer, audience and expiry. Derive
`sub` from verified claims. Enforce ownership in every task
query/mutation.

If the assessment demonstration uses a temporary test identity, clearly
label it as test-only, protect the environment, and do not present it as
production authentication.

------------------------------------------------------------------------

# 12. GraphQL operations and end-to-end integration tests

## 12.1 Required query/mutation tests

Test: - `getTasks` returns only the authenticated user's tasks. -
`getTaskById` returns the user's task and does not disclose another
user's task. - `createTask` inserts a row and returns it. - `updateTask`
changes only permitted fields. - `deleteTask` deletes only an authorized
task. - Invalid title, enum, UUID and missing fields are rejected. -
Unauthenticated requests are rejected. - Database failure returns a safe
error and logs details server-side.

## 12.2 Example GraphQL requests

Query:

``` graphql
query GetTasks {
  getTasks {
    id
    title
    status
    priority
  }
}
```

Mutation:

``` graphql
mutation CreateTask {
  createTask(input: {
    title: "Prepare DevOps assessment"
    description: "Deploy GraphQL platform"
    priority: HIGH
  }) {
    id
    title
    status
  }
}
```

Update:

``` graphql
mutation UpdateTask($id: ID!) {
  updateTask(id: $id, input: { status: IN_PROGRESS }) {
    id
    status
  }
}
```

Delete:

``` graphql
mutation DeleteTask($id: ID!) {
  deleteTask(id: $id)
}
```

## 12.3 Subscription protocol requirement

The assessment explicitly includes subscriptions. Implement and test a
real GraphQL subscription transport. A recommended protocol is
`graphql-transport-ws`, commonly used with Apollo Client's GraphQL
WebSocket support.

A correct implementation must handle: - WebSocket upgrade and
authentication. - `connection_init` and `connection_ack`. - `subscribe`
with operation ID and GraphQL subscription payload. - `next` messages
containing GraphQL execution results. - `complete`. - `ping` and
`pong`. - Invalid operation and unauthorized subscription errors. -
Disconnect cleanup. - Event delivery only to subscribers authorized for
that event.

The Lambda publisher is responsible for publishing events after
successful mutations. The WebSocket delivery service maintains
connection/subscription state in a durable store (for example DynamoDB)
and sends protocol-compliant GraphQL result messages. Do not keep
persistent WebSocket connections inside Lambda execution environments.
If API Gateway WebSocket is selected, implement the protocol state
machine across its routes and persisted connection state; do not assume
that API Gateway automatically provides GraphQL subscription semantics.

**Subscription acceptance test:** open two authenticated clients;
subscribe both to `taskChanged`; create/update a task; verify both
authorized clients receive a valid GraphQL `next` payload; verify an
unauthorized client receives nothing; disconnect one client and confirm
its connection record is removed.

------------------------------------------------------------------------

# 13. Database migration and recovery

## 13.1 Migration workflow

Local development:

``` powershell
npx prisma migrate dev --name describe_change
```

Deployed environment:

``` powershell
npx prisma migrate deploy
```

Run migrations as a controlled one-off task/job or release step with a
narrowly scoped database role. Do not run destructive migrations blindly
on every deployment.

## 13.2 Expand/contract pattern

1.  Add new nullable columns/tables/indexes in a backward-compatible
    way.
2.  Deploy code that can read old and new schema.
3.  Backfill data in controlled batches if required.
4.  Switch application behavior.
5.  Verify old code paths are no longer used.
6.  Remove obsolete schema in a later release.

## 13.3 Backups and restore

-   Configure automated backups and retention.
-   Enable point-in-time recovery where supported.
-   Take a manual snapshot before risky production migrations.
-   Test restore to a separate environment.
-   Document RPO/RTO targets rather than inventing guarantees.
-   Remember that rolling back application code does not automatically
    reverse a database schema change.

------------------------------------------------------------------------

# 14. Security hardening checklist

-   [ ] ECS tasks run in private subnets with no public IP.
-   [ ] RDS is private and encrypted.
-   [ ] RDS SG permits only approved source SGs.
-   [ ] Lambda and ECS connect to RDS Proxy using TLS where configured.
-   [ ] S3 blocks all public access.
-   [ ] CloudFront OAC is the only S3 read path.
-   [ ] HTTPS is enforced; WebSocket uses WSS.
-   [ ] JWT validation is performed server-side.
-   [ ] Task ownership is enforced in backend services.
-   [ ] GraphQL query depth/complexity and request size are limited.
-   [ ] CORS is restricted to expected origins.
-   [ ] Runtime roles follow least privilege.
-   [ ] GitHub uses OIDC rather than static AWS access keys.
-   [ ] Secrets are stored in Secrets Manager/KMS.
-   [ ] No secrets appear in Git, artifacts, image layers, logs, or
    outputs.
-   [ ] Containers run as non-root.
-   [ ] Dependencies and images are scanned.
-   [ ] CloudWatch logs have explicit retention.
-   [ ] Terraform state is encrypted, versioned and access-restricted.
-   [ ] Production deployment has an approval gate.

------------------------------------------------------------------------

# 15. GitHub Actions CI/CD

## 15.1 GitHub OIDC setup

Create an AWS IAM OIDC provider for GitHub Actions if one does not
already exist. Create a deployment role with a trust policy restricted
to: - The exact GitHub organization/repository. - The intended branch or
GitHub Environment. - The intended audience (`sts.amazonaws.com`).

Use separate roles/environments for dev and prod. Do not save AWS access
key ID/secret access key in GitHub secrets.

Configure GitHub repository variables for non-secret values such as AWS
region, role ARN, ECR repository, ECS cluster/service, S3 bucket and
CloudFront distribution ID. Use GitHub Environments for protected
production deployment and approval.

## 15.2 Pull request workflow

Create `.github/workflows/pull-request.yml`:

``` yaml
name: Pull Request Validation

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

Pin third-party actions to reviewed commit SHAs for a hardened
production workflow. Add integration tests, dependency audit, secret
scanning, container scanning and SAM/Terraform validation as their
projects are configured.

## 15.3 Deployment workflow design

The deployment workflow must have separate jobs/stages: 1. Validate
source. 2. Build frontend and Lambda artifacts. 3. Build and scan
container image. 4. Authenticate to AWS using OIDC. 5. Apply reviewed
Terraform changes only when infrastructure changes are approved. 6.
Deploy SAM Lambda stack. 7. Push image to ECR and update ECS service. 8.
Upload frontend assets and invalidate CloudFront. 9. Run smoke tests.
10. Stop promotion if any check fails. 11. Require GitHub Environment
approval for production.

Do not allow untrusted pull-request code to assume the production role.

## 15.4 Example AWS OIDC authentication step

``` yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: actions/checkout@v4

  - name: Configure AWS credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ vars.AWS_DEPLOY_ROLE_ARN }}
      aws-region: ${{ vars.AWS_REGION }}

  - name: Verify AWS identity
    run: aws sts get-caller-identity
```

The role trust policy must restrict the `sub` claim; the workflow
snippet alone does not secure the role.

## 15.5 SAM deploy job

The Lambda deployment job should: - Install Node.js and SAM CLI. - Run
`npm ci`. - Run lint, typecheck and tests. - Run
`sam validate --lint`. - Run `sam build`. - Assume the dev deployment
role using OIDC. - Run
`sam deploy --config-env dev --no-confirm-changeset`. - Capture stack
outputs and run Lambda smoke tests.

For production, use a protected environment and Lambda versions/aliases
with CodeDeploy canary or linear traffic shifting plus CloudWatch
alarms.

## 15.6 ECS deploy job

The ECS job should: - Run tests. - Build Docker image. - Scan image. -
Authenticate to ECR through the OIDC-assumed role. - Push immutable
image tag based on commit SHA. - Render/register a new task definition
revision. - Update ECS service. - Wait for service stability. - Run
`/health` and GraphQL smoke tests. - Fail the workflow if tasks are
unhealthy or smoke tests fail.

Enable ECS deployment circuit breaker rollback. Keep prior task
definition revisions and immutable ECR images.

## 15.7 Frontend deploy job

The frontend job should: - Run lint, tests and build. - Upload hashed
assets with long cache headers. - Upload `index.html` with
short/no-cache headers. - Invalidate CloudFront entrypoint paths. - Test
HTTPS URL and GraphQL connectivity.

## 15.8 Production gate

Use GitHub Environment `production` with required reviewers. Only
promote a release that has passed dev smoke tests. Keep a deployment
record containing commit SHA, Lambda version, ECS task definition
revision, image digest, frontend artifact ID, migration version and
workflow URL.

------------------------------------------------------------------------

# 16. Deployment order and release runbook

Deploy in this order:

1.  Confirm AWS budget and region.
2.  Bootstrap remote Terraform state bucket and state access.
3.  Apply VPC, subnet, route and security group foundation.
4.  Create ECR and IAM roles.
5.  Create Secrets Manager secret metadata and secure secret value
    out-of-band.
6.  Create RDS PostgreSQL and optional RDS Proxy.
7.  Run database migration through a controlled path.
8.  Build and deploy Lambda functions using SAM.
9.  Build and push GraphQL server image.
10. Deploy ECS cluster/service/ALB and verify health.
11. Verify ECS-to-RDS and Lambda-to-RDS connectivity separately.
12. Deploy subscription connection/event resources and test GraphQL
    WebSocket protocol.
13. Deploy React frontend to S3/CloudFront.
14. Configure GitHub Actions end-to-end.
15. Configure CloudWatch alarms/dashboard/SNS and test notifications.
16. Run end-to-end, security, scaling and rollback tests.
17. Capture final architecture, logs, workflow evidence and costs.

Never apply all infrastructure without reviewing the plan. Do not run a
production migration without a backup and compatibility review.

------------------------------------------------------------------------

# 17. Scaling strategy

## 17.1 ECS Fargate

Use Application Auto Scaling for ECS desired task count. Configure
target tracking on CPU/memory or ALB requests per target based on the
workload. Set min/max capacity and cooldowns.

Development: - Min 1 task, desired 1, max 2 (only if test requires
scaling).

Production starting point (validate with load tests): - Min 2 tasks
across AZs. - Desired 2. - Max based on budget and load. - Target
tracking based on CPU/memory or request count. - Deployment health
checks and circuit breaker.

Do not claim autoscaling is tested until a load test demonstrates
scale-out and scale-in.

## 17.2 Lambda

Lambda automatically scales concurrency subject to account/function
limits. Configure: - Reserved concurrency to protect RDS. - Timeout and
memory based on measured duration. - Provisioned concurrency only if
cold-start latency requires it and cost is justified. - RDS
Proxy/connection reuse where appropriate. - DLQ or retry policy for
asynchronous event publishing where applicable.

Lambda concurrency must not exceed the safe database connection budget.

## 17.3 RDS

RDS scaling choices: - Vertical scaling: change instance class after
measuring CPU, memory and database load. - Storage autoscaling:
configure only where supported and set a maximum. - Multi-AZ:
availability/failover, not read scaling. - Read replica: add only if
read workload requires it and supported by the selected
engine/configuration. - RDS Proxy: connection pooling/management, not
database compute scaling.

Document why a read replica is or is not needed using CloudWatch
database metrics and test workload.

## 17.4 Load test

Run a controlled test against dev only. Record baseline and peak: -
Requests per second. - p50/p95/p99 latency. - ECS CPU/memory and task
count. - Lambda invocations, duration, errors, throttles and
concurrency. - RDS CPU, connections, freeable memory and latency. -
Error rate.

Stop the test if costs or database pressure exceed the agreed limit.

------------------------------------------------------------------------

# 18. CloudWatch monitoring, logs, metrics and alerts

## 18.1 Log groups

Create explicit log groups and retention for: - ECS GraphQL
application. - Each Lambda function. - Relevant API Gateway WebSocket
handlers. - Any migration task. - ALB access logs (if enabled, stored in
a protected S3 bucket).

Use structured JSON logs. Include timestamp, level, service,
environment, request ID, operation, duration and safe error code. Do not
log tokens, passwords, connection strings or sensitive payloads.

## 18.2 Required metrics

**Lambda** - Invocations - Errors - Duration - Throttles - Concurrent
executions

**ECS/ALB** - CPU and memory utilization - Desired/running task count -
Deployment failures - Healthy/unhealthy target count - Target response
time - HTTP 5xx count/rate

**RDS** - Database connections - CPU utilization - Free storage -
Freeable memory - Read/write latency and IOPS - Database load where
available - Replica lag if replicas are configured

## 18.3 Alarm design

Create alarms for: - Lambda errors greater than the agreed threshold. -
Lambda throttles greater than zero for critical functions. - Lambda
duration/latency above the agreed SLO. - ECS running tasks below desired
count. - ECS CPU/memory sustained above target. - ALB unhealthy
targets. - ALB 5xx rate above threshold. - RDS connections approaching
tested safe capacity. - RDS CPU sustained high. - RDS free storage below
safe threshold.

Use thresholds based on measured baseline; initial thresholds are test
values, not universal production limits. Send alarms to SNS and confirm
the email subscription. Test at least one alarm deliberately.

## 18.4 Dashboard

Create a CloudWatch dashboard with: - Lambda invocation/error/duration
widgets. - ECS CPU/memory/task count widgets. - ALB request
count/latency/5xx/healthy targets. - RDS connections/CPU/free
storage/latency. - Alarm status.

Set retention to control log cost (for example, 7 days in disposable
dev; production retention follows organizational requirements).

------------------------------------------------------------------------

# 19. Rollback strategy and test procedure

The assessment explicitly asks for rollback using Serverless Framework
and GitHub Actions. This project uses AWS SAM for Lambda deployment, so
implement the equivalent release controls with SAM-managed Lambda
versions/aliases, CodeDeploy traffic shifting and GitHub Actions
orchestration.

## 19.1 ECS rollback

-   Enable ECS deployment circuit breaker with rollback.
-   Keep previous task definition revision.
-   Keep previous immutable ECR image.
-   Fail deployment if service does not stabilize or smoke test fails.
-   Redeploy prior task definition revision when manual rollback is
    required.

## 19.2 Lambda rollback

-   Publish Lambda versions.
-   Route production alias to a version.
-   Use CodeDeploy canary/linear deployment.
-   Configure CloudWatch alarms to stop deployment and roll traffic
    back.
-   Retain previous stable version.
-   If necessary, move alias back to previous version and verify.

## 19.3 Frontend rollback

-   Retain previous build artifact or release prefix.
-   Restore previous artifact to the live S3 prefix.
-   Invalidate CloudFront `index.html` and changed paths.
-   Verify HTML references existing hashed assets.
-   Run frontend and GraphQL smoke tests.

## 19.4 Database rollback

Application rollback does not undo database changes. Use
backward-compatible expand/contract migrations. For destructive
migrations, use a tested backup/snapshot and restore plan. Do not assume
Prisma can safely reverse every migration.

## 19.5 Terraform rollback

Terraform has no universal automatic rollback. Revert the infrastructure
code to a known-good revision, review a new plan, and apply a corrective
change. Never blindly restore an old state file or destroy shared
resources.

## 19.6 Rollback drill

In dev: 1. Deploy a known-good release and record all artifact/version
IDs. 2. Deploy a deliberately failing release (for example, failing
health check in a test branch). 3. Verify ECS circuit breaker restores
the previous task definition, or Lambda alarm returns alias traffic to
the previous version. 4. Verify GitHub Actions marks deployment failed
and does not promote production. 5. Restore the frontend previous
artifact if frontend deploy is part of the drill. 6. Run GraphQL
query/mutation smoke tests. 7. Capture workflow logs, version IDs and
successful recovery evidence.

A written rollback plan is not an implemented rollback. Capture the
drill.

------------------------------------------------------------------------

# 20. Cost control and teardown

## 20.1 Cost controls

Before applying: - Create AWS Budget and email alert. - Review Terraform
plan for hourly resources. - Use one ECS task in dev. - Use a small
single-AZ RDS instance for disposable dev where acceptable. - Keep log
retention short. - Avoid unnecessary NAT Gateways and endpoints; compare
costs. - Avoid read replicas until metrics justify them. - Do not leave
load tests running. - Delete unused ECR images and old snapshots
according to retention policy. - Use CloudFront/S3 caching to reduce
origin requests.

## 20.2 Teardown

Before destroying: 1. Export evidence and deployment outputs. 2. Back up
any database data that must be retained. 3. Confirm the environment is
disposable. 4. Disable or remove application-facing resources in
dependency-safe order. 5. Run `terraform plan -destroy` and inspect
every resource. 6. Only then run `terraform destroy` if approved. 7.
Check for leftovers: NAT Gateway, ALB, EIP/public IPv4, RDS snapshots,
CloudWatch log groups, S3 objects, ECR images, Secrets Manager secrets,
CloudFront distribution, Route 53 records and VPC endpoints.

Do not delete the Terraform state bucket or evidence until the project
handover is complete.

------------------------------------------------------------------------

# 21. Final testing and assessment completion tracker

Use this table honestly. Set status to **Complete** only after the test
passes and evidence is saved.

  --------------------------------------------------------------------------------------------------------------------------
  ID             Requirement      Test to perform                                    Evidence to save         Status
  -------------- ---------------- -------------------------------------------------- ------------------------ --------------
  A1             React frontend   Load app and perform task actions                  HTTPS URL, screenshots,  Not started
                                                                                     test output              

  A2             AWS frontend     Verify CloudFront and private S3 origin            Distribution, bucket     Not started
                 hosting                                                             policy, public access    
                                                                                     block                    

  A3             Caching          Inspect response cache headers for HTML and hashed `curl -I` output         Not started
                                  assets                                                                      

  A4             SSL              Verify HTTPS certificate and HTTP redirect         Browser/curl output      Not started

  A5             Multiple         List deployed functions and invoke each            SAM stack outputs,       Not started
                 TypeScript                                                          invocation results       
                 Lambdas                                                                                      

  A6             SAM deployment   Run SAM validate/build/deploy                      Workflow log, stack      Not started
                                                                                     output                   

  A7             GraphQL ECS      Verify service/task and health                     ECS service/task         Not started
                 Fargate                                                             details, target health   

  A8             Private ECS      Verify private subnet/no public IP                 ECS task ENI/subnet      Not started
                 placement                                                           details                  

  A9             RDS private      Verify no public access and private subnet group   RDS describe output, SG  Not started
                                                                                     rules                    

  A10            Lambda-to-RDS    Invoke Lambda query/mutation against DB            Lambda logs and DB row   Not started

  A11            ECS-to-RDS       Execute direct GraphQL server DB health/read path  ECS logs and successful  Not started
                                                                                     response                 

  A12            GraphQL/Lambda   Trace GraphQL query/mutation through Lambda        API response, Lambda     Not started
                 integration                                                         invocation/logs          

  A13            GraphQL          Run protocol-compliant subscription test           Client output and event  Not started
                 subscriptions                                                       logs                     

  A14            GitHub Actions   Run PR validation and deployment                   Workflow URLs/logs       Not started

  A15            Pre-production   Demonstrate failed test blocks deploy              Failed workflow run      Not started
                 validation                                                                                   

  A16            CloudWatch logs  Inspect Lambda, ECS and RDS-related logs/metrics   Screenshots/dashboard    Not started

  A17            CloudWatch       Trigger test alarm and receive SNS alert           Alarm history/email      Not started
                 alarms                                                              evidence                 

  A18            IAM access       Review roles/trust policies/permissions            Policy JSON and access   Not started
                 control                                                             test                     

  A19            Secrets Manager  Confirm runtime secret access and no plaintext     Secret metadata, logs    Not started
                                  leakage                                            scan                     

  A20            ECS scaling      Demonstrate task scale-out/in                      Service events and task  Not started
                                                                                     count                    

  A21            Lambda scaling   Verify concurrency configuration and behavior      Function                 Not started
                 controls                                                            configuration/metrics    

  A22            RDS scaling      Document vertical/storage/read-replica decision    Metrics and design note  Not started
                 strategy                                                                                     

  A23            Rollback         Perform failed deployment and restore stable       Workflow,                Not started
                                  release                                            version/revision IDs,    
                                                                                     smoke test               

  A24            Architecture     Commit final diagram                               `docs/architecture.md`   Not started
                 diagram                                                             or exported diagram      

  A25            Detailed         Complete                                           `docs/` directory        Not started
                 documentation    deployment/security/CI/CD/DB/monitoring/rollback                            
                                  docs                                                                        

  A26            Cost controls    Budget alert and teardown review                   Budget screenshot and    Not started
                                                                                     cleanup record           
  --------------------------------------------------------------------------------------------------------------------------

## 21.1 Definition of done

The project is ready to submit only when: - All required rows above are
complete or any unavoidable exception is explicitly disclosed. - The
architecture diagram matches the resources actually deployed. - The
GitHub repository contains application source, Terraform, SAM template,
workflows, tests and documentation. - The deployment process can be
repeated from a clean environment using the documented commands. - The
reviewer can see that both ECS and Lambda connect to RDS. - Queries,
mutations and subscriptions work. - CloudWatch alarms have been
tested. - At least one rollback drill has succeeded. - No secrets or
credentials are committed. - The cost and availability trade-offs are
clearly documented.

------------------------------------------------------------------------

# 22. Submission package and Loom walkthrough

The assessment asks for an architecture diagram and detailed
documentation. Prepare these submission items:

1.  GitHub repository URL.
2.  Architecture diagram (source file plus PNG/PDF export if requested).
3.  README with project overview, prerequisites, setup and deployment
    links.
4.  Deployment and testing guide.
5.  IAM/security guide.
6.  CI/CD workflow guide.
7.  Database setup/security guide.
8.  Monitoring and alerting guide.
9.  Rollback and recovery guide.
10. Evidence folder containing sanitized screenshots, workflow run
    links, test results and deployment identifiers.
11. Loom walkthrough explaining:
    -   Architecture and why the services were selected.
    -   React → GraphQL → Lambda → RDS request path.
    -   Separate ECS-to-RDS connectivity proof.
    -   Subscription protocol and event flow.
    -   Terraform/SAM ownership split.
    -   GitHub Actions and OIDC.
    -   IAM/secrets/security.
    -   CloudWatch metrics and alarms.
    -   Scaling and cost decisions.
    -   Rollback demonstration.

Never show AWS secret values, access keys, database passwords, JWTs,
personal data, or private account identifiers in screenshots or Loom
recordings.

------------------------------------------------------------------------

# 23. Troubleshooting guide

  --------------------------------------------------------------------------
  Symptom                 Likely causes              First checks
  ----------------------- -------------------------- -----------------------
  ECS task stops          Bad image/command, missing ECS stopped reason,
  immediately             env/secret, port mismatch  container logs, task
                                                     definition

  ALB target unhealthy    Wrong health path/port,    Target health reason,
                          app binds localhost, SG    container port, app
                          rule missing               bind address

  Lambda times out        VPC route/SG/endpoint      Lambda VPC config, SGs,
  connecting to DB        issue, wrong proxy         proxy target health,
                          endpoint, secret access    CloudWatch logs

  ECS cannot invoke       Task role lacks            ECS task role,
  Lambda                  `lambda:InvokeFunction`,   CloudTrail, SDK error
                          wrong ARN/region           

  GraphQL returns 401/403 JWT issuer/audience/expiry Token claims, auth
                          or authorization policy    logs, CORS

  Subscription connects   Protocol mismatch, event   WebSocket route logs,
  but receives no event   publisher not invoked,     event logs,
                          connection registry issue  subscription record

  SAM deploy fails        Invalid template, missing  `sam validate`,
                          permissions, artifact      CloudFormation events,
                          bucket/config issue        role policy

  CloudFront returns 403  OAC/bucket policy/origin   Distribution origin,
                          mismatch                   bucket policy, OAC
                                                     signing

  New frontend not        Cached HTML or incorrect   `index.html` headers,
  visible                 upload cache headers       invalidation status

  Terraform wants to      Immutable argument change  Inspect plan; do not
  replace RDS             or config drift            apply until understood

  DB connection           Lambda concurrency/pool    RDS connections, Lambda
  exhaustion              sizing, no proxy,          concurrency, pool
                          connection leak            settings

  Rollback fails          Previous                   Artifact retention,
                          image/version/artifact     task revision, alias,
                          removed or incompatible    migration compatibility
                          schema                     
  --------------------------------------------------------------------------

------------------------------------------------------------------------

# 24. Important engineering notes and limitations

1.  The assessment requests Lambda functions for queries, mutations and
    subscriptions. Implement the subscription event publisher and
    GraphQL WebSocket protocol; do not claim that a basic notification
    WebSocket is a GraphQL subscription.
2.  The assessment requests both Lambda functions and the private
    GraphQL server to connect to RDS. Prove both network/application
    paths independently.
3.  The GraphQL compute tasks must be private. A browser-facing frontend
    still needs a controlled ingress mechanism; document the ingress
    separately from private task placement.
4.  The assessment mentions RDS instance scaling and read replicas if
    required. RDS compute does not automatically scale like Lambda.
    Describe actual mechanisms accurately.
5.  The assessment says Serverless Framework and GitHub Actions for
    rollback. This implementation selects SAM, which is explicitly
    allowed for Lambda deployment, and uses Lambda versions/aliases,
    CodeDeploy and GitHub Actions to provide equivalent release rollback
    controls. State this choice clearly in the submission.
6.  Terraform state may contain sensitive data. Marking an output
    sensitive does not remove it from state.
7.  A Terraform plan, architecture diagram, or written runbook is not
    proof of a deployed feature. Evidence must come from actual AWS
    configuration, test output and workflow runs.
8.  The example code and templates in this guide are starting
    implementation patterns. Validate them against the final repository
    structure, dependency versions, exact AWS resource outputs, IAM
    permissions and SAM/Terraform ownership before deployment. Replace
    every `REPLACE_*` placeholder and test in dev.
9.  The design should be kept minimal for the assessment budget. Add
    production resilience only when the cost is understood and the
    benefit is justified.

------------------------------------------------------------------------

# 25. Official reference documentation

Use official AWS and framework documentation when implementing
version-specific details:

-   AWS SAM Developer Guide:
    https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/
-   AWS Lambda Developer Guide:
    https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
-   Amazon ECS Developer Guide:
    https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html
-   ECS Service Auto Scaling:
    https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-auto-scaling.html
-   Amazon RDS for PostgreSQL:
    https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
-   Amazon RDS Proxy:
    https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
-   CloudFront Origin Access Control:
    https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
-   GitHub Actions OIDC with AWS:
    https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
-   Terraform AWS Provider:
    https://registry.terraform.io/providers/hashicorp/aws/latest/docs
-   Apollo Server: https://www.apollographql.com/docs/apollo-server/
-   GraphQL over WebSocket protocol:
    https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
-   Prisma migrations: https://www.prisma.io/docs/orm/prisma-migrate

------------------------------------------------------------------------

**End of implementation guide.** Keep the assessment tracker current
throughout the build. The final submission must distinguish clearly
between implemented, tested, planned, and intentionally omitted items.
