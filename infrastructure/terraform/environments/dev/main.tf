data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.0.0/20"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.16.0/20"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
}

resource "aws_subnet" "app_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.128.0/20"
  availability_zone = data.aws_availability_zones.available.names[0]
}

resource "aws_subnet" "app_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.144.0/20"
  availability_zone = data.aws_availability_zones.available.names[1]
}

resource "aws_subnet" "db_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.160.0/20"
  availability_zone = data.aws_availability_zones.available.names[0]
}

resource "aws_subnet" "db_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.176.0/20"
  availability_zone = data.aws_availability_zones.available.names[1]
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}

resource "aws_route_table_association" "app_a" {
  subnet_id      = aws_subnet.app_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "app_b" {
  subnet_id      = aws_subnet.app_b.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "db_a" {
  subnet_id      = aws_subnet.db_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "db_b" {
  subnet_id      = aws_subnet.db_b.id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "api_gateway_vpc_link" {
  name   = "${var.environment}-graphql-vpc-link"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_egress_rule" "vpc_link_to_ecs" {
  security_group_id            = aws_security_group.api_gateway_vpc_link.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 4000
  to_port                      = 4000
  ip_protocol                  = "tcp"
}

resource "aws_security_group" "ecs" {
  name   = "${var.environment}-graphql-ecs"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_vpc_link" {
  security_group_id            = aws_security_group.ecs.id
  referenced_security_group_id = aws_security_group.api_gateway_vpc_link.id
  from_port                    = 4000
  to_port                      = 4000
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "lambda" {
  name   = "${var.environment}-graphql-lambda"
  vpc_id = aws_vpc.main.id
}

resource "aws_vpc_security_group_egress_rule" "lambda_all" {
  security_group_id = aws_security_group.lambda.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_security_group" "database" {
  name   = "${var.environment}-graphql-db"
  vpc_id = aws_vpc.main.id
  egress = []
}

resource "aws_security_group" "proxy" {
  name   = "${var.environment}-graphql-proxy"
  vpc_id = aws_vpc.main.id
  egress = []
}

resource "aws_vpc_security_group_ingress_rule" "database_from_proxy" {
  count                        = var.enable_rds_proxy ? 1 : 0
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.proxy.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "database_from_ecs_direct" {
  count                        = var.enable_rds_proxy ? 0 : 1
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "database_from_lambda_direct" {
  count                        = var.enable_rds_proxy ? 0 : 1
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_ecs" {
  count                        = var.enable_rds_proxy ? 1 : 0
  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = aws_security_group.ecs.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_lambda" {
  count                        = var.enable_rds_proxy ? 1 : 0
  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = aws_security_group.lambda.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_egress_rule" "proxy_to_db" {
  count                        = var.enable_rds_proxy ? 1 : 0
  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = aws_security_group.database.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.environment}-graphql-db"
  subnet_ids = [aws_subnet.db_a.id, aws_subnet.db_b.id]
}

resource "aws_db_instance" "main" {
  identifier                  = "${var.environment}-graphql-postgres"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.db_instance_class
  allocated_storage           = 20
  max_allocated_storage       = 50
  storage_type                = "gp3"
  storage_encrypted           = true
  db_name                     = var.db_name
  username                    = "task_admin"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.database.id]
  publicly_accessible         = false
  backup_retention_period     = 7
  deletion_protection         = false
  skip_final_snapshot         = true
  apply_immediately           = true
}

resource "aws_iam_role" "proxy" {
  count = var.enable_rds_proxy ? 1 : 0
  name  = "${var.environment}-graphql-rds-proxy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "proxy" {
  count = var.enable_rds_proxy ? 1 : 0
  role  = aws_iam_role.proxy[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_db_instance.main.master_user_secret[0].secret_arn
    }]
  })
}

resource "aws_db_proxy" "main" {
  count                  = var.enable_rds_proxy ? 1 : 0
  name                   = "${var.environment}-graphql-proxy"
  engine_family          = "POSTGRESQL"
  role_arn               = aws_iam_role.proxy[0].arn
  vpc_subnet_ids         = [aws_subnet.app_a.id, aws_subnet.app_b.id]
  vpc_security_group_ids = [aws_security_group.proxy.id]
  require_tls            = true
  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = aws_db_instance.main.master_user_secret[0].secret_arn
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  count         = var.enable_rds_proxy ? 1 : 0
  db_proxy_name = aws_db_proxy.main[0].name
  connection_pool_config {
    connection_borrow_timeout = 120
    max_connections_percent   = 80
  }
}

resource "aws_db_proxy_target" "main" {
  count                  = var.enable_rds_proxy ? 1 : 0
  db_proxy_name          = aws_db_proxy.main[0].name
  target_group_name      = aws_db_proxy_default_target_group.main[0].name
  db_instance_identifier = aws_db_instance.main.identifier
}

locals {
  database_endpoint   = var.enable_rds_proxy ? aws_db_proxy.main[0].endpoint : aws_db_instance.main.address
  database_secret_arn = aws_db_instance.main.master_user_secret[0].secret_arn
  frontend_origin     = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.frontend[0].domain_name}" : var.enable_amplify ? "https://${aws_amplify_branch.frontend[0].branch_name}.${aws_amplify_app.frontend[0].default_domain}" : "http://localhost:5173"
}

resource "aws_ecr_repository" "graphql" {
  name                 = "${var.environment}-graphql-api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.environment}-graphql-api"
  retention_in_days = 7
}

resource "aws_ecs_cluster" "main" {
  name = "${var.environment}-graphql"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_iam_role" "ecs_task" {
  name = "${var.environment}-graphql-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      { Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = local.database_secret_arn },
      {
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-get-tasks",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-get-task",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-create-task",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-update-task",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-delete-task",
          "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-publish-task-event"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "migration_task" {
  name = "${var.environment}-graphql-migration-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "migration_task" {
  name = "${var.environment}-graphql-migration-secret"
  role = aws_iam_role.migration_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = local.database_secret_arn
    }]
  })
}

resource "aws_iam_role" "ecs_execution" {
  name = "${var.environment}-graphql-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_service_discovery_private_dns_namespace" "graphql" {
  name        = "${var.environment}.graphql.internal"
  description = "Private namespace for GraphQL ECS tasks"
  vpc         = aws_vpc.main.id
}

resource "aws_service_discovery_service" "graphql" {
  name = "graphql"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.graphql.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "SRV"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

resource "aws_apigatewayv2_vpc_link" "graphql" {
  name               = "${var.environment}-graphql-vpc-link"
  subnet_ids         = [aws_subnet.app_a.id, aws_subnet.app_b.id]
  security_group_ids = [aws_security_group.api_gateway_vpc_link.id]
}

resource "aws_apigatewayv2_api" "graphql" {
  name          = "${var.environment}-graphql-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = distinct([local.frontend_origin, "http://localhost:5173"])
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.graphql.id
  name             = "${var.environment}-graphql-jwt"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [var.jwt_audience]
    issuer   = var.jwt_issuer_url
  }
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.environment}-graphql-http"
  retention_in_days = 7
}

resource "aws_apigatewayv2_integration" "graphql" {
  api_id                 = aws_apigatewayv2_api.graphql.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = aws_service_discovery_service.graphql.arn
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.graphql.id
  payload_format_version = "1.0"
  timeout_milliseconds   = 30000
}

resource "aws_apigatewayv2_route" "graphql" {
  api_id             = aws_apigatewayv2_api.graphql.id
  route_key          = "$default"
  target             = "integrations/${aws_apigatewayv2_integration.graphql.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_route" "graphql_preflight" {
  api_id             = aws_apigatewayv2_api.graphql.id
  route_key          = "OPTIONS /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.graphql.id}"
  authorization_type = "NONE"
}

resource "aws_apigatewayv2_stage" "graphql" {
  api_id      = aws_apigatewayv2_api.graphql.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.api_throttle_burst
    throttling_rate_limit  = var.api_throttle_rate
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId               = "$context.requestId"
      requestTime             = "$context.requestTime"
      httpMethod              = "$context.httpMethod"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      sourceIp                = "$context.identity.sourceIp"
    })
  }
}

resource "aws_ecs_task_definition" "graphql" {
  family                   = "${var.environment}-graphql-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([{
    name         = "graphql-api"
    image        = "${aws_ecr_repository.graphql.repository_url}:${var.container_image_tag}"
    essential    = true
    portMappings = [{ containerPort = 4000, protocol = "tcp" }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "4000" },
      { name = "USE_AWS_LAMBDAS", value = "true" },
      { name = "GET_TASKS_FUNCTION_NAME", value = "${var.environment}-graphql-get-tasks" },
      { name = "GET_TASK_FUNCTION_NAME", value = "${var.environment}-graphql-get-task" },
      { name = "CREATE_TASK_FUNCTION_NAME", value = "${var.environment}-graphql-create-task" },
      { name = "UPDATE_TASK_FUNCTION_NAME", value = "${var.environment}-graphql-update-task" },
      { name = "DELETE_TASK_FUNCTION_NAME", value = "${var.environment}-graphql-delete-task" },
      { name = "PUBLISH_TASK_EVENT_FUNCTION_NAME", value = "${var.environment}-graphql-publish-task-event" },
      { name = "JWT_ISSUER", value = var.jwt_issuer_url },
      { name = "JWT_AUDIENCE", value = var.jwt_audience },
      { name = "CORS_ORIGINS", value = join(",", distinct([local.frontend_origin, "http://localhost:5173"])) },
      { name = "DATABASE_SECRET_ARN", value = local.database_secret_arn },
      { name = "DB_HOST", value = local.database_endpoint }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ecs"
      }
    }
    healthCheck = {
      command     = ["CMD", "node", "-e", "fetch('http://127.0.0.1:4000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 20
    }
  }])

  # GitHub Actions owns deployed image revisions and runtime container configuration.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

resource "aws_ecs_task_definition" "migration" {
  family                   = "${var.environment}-graphql-migration"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.migration_task.arn
  container_definitions = jsonencode([{
    name      = "db-migrate"
    image     = "${aws_ecr_repository.graphql.repository_url}:${var.container_image_tag}"
    essential = true
    command   = ["node", "database/prisma/migrate.mjs"]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "AWS_REGION", value = var.aws_region },
      { name = "DATABASE_SECRET_ARN", value = local.database_secret_arn },
      { name = "DB_HOST", value = local.database_endpoint },
      { name = "DB_NAME", value = var.db_name }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "migration"
      }
    }
  }])
}

resource "aws_ecs_service" "graphql" {
  name                              = "${var.environment}-graphql-api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.graphql.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 30
  network_configuration {
    subnets          = [aws_subnet.app_a.id, aws_subnet.app_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }
  service_registries {
    registry_arn   = aws_service_discovery_service.graphql.arn
    container_name = "graphql-api"
    container_port = 4000
  }
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.ecs_max_capacity
  min_capacity       = var.ecs_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.graphql.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "${var.environment}-graphql-ecs-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 60
    scale_in_cooldown  = 120
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.environment}-graphql-taskflow-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_amplify_app" "frontend" {
  count = var.enable_amplify ? 1 : 0

  name                        = "${var.environment}-graphql-taskflow"
  platform                    = "WEB"
  enable_auto_branch_creation = false
  enable_branch_auto_deletion = false
  custom_headers              = <<-EOT
    customHeaders:
      - pattern: '/assets/*'
        headers:
          - key: Cache-Control
            value: public,max-age=31536000,immutable
      - pattern: '/index.html'
        headers:
          - key: Cache-Control
            value: public,max-age=0,must-revalidate
  EOT

  custom_rule {
    source = "</^[^.]+$/>"
    target = "/index.html"
    status = "200"
  }

  # Amplify normalizes YAML custom headers to JSON on read.
  lifecycle {
    ignore_changes = [custom_headers]
  }
}

resource "aws_amplify_branch" "frontend" {
  count = var.enable_amplify ? 1 : 0

  app_id            = aws_amplify_app.frontend[0].id
  branch_name       = "main"
  description       = "Production frontend deployed by GitHub Actions"
  framework         = "React"
  stage             = "PRODUCTION"
  enable_auto_build = false
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  count                             = var.enable_cloudfront ? 1 : 0
  name                              = "${var.environment}-graphql-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  count               = var.enable_cloudfront ? 1 : 0
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend[0].id
  }
  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
    minimum_protocol_version       = "TLSv1.2_2021"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  count  = var.enable_cloudfront ? 1 : 0
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend[0].arn
        }
      }
    }]
  })
}

resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-graphql-alerts"
}

resource "aws_cloudwatch_metric_alarm" "ecs_running_tasks" {
  alarm_name          = "${var.environment}-graphql-ecs-running-tasks"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Minimum"
  threshold           = var.ecs_min_capacity
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.graphql.name
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  alarm_name          = "${var.environment}-graphql-api-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    ApiId = aws_apigatewayv2_api.graphql.id
    Stage = aws_apigatewayv2_stage.graphql.name
  }
}

locals {
  lambda_function_names = toset([
    "${var.environment}-graphql-get-tasks",
    "${var.environment}-graphql-get-task",
    "${var.environment}-graphql-create-task",
    "${var.environment}-graphql-update-task",
    "${var.environment}-graphql-delete-task",
    "${var.environment}-graphql-publish-task-event",
    "${var.environment}-graphql-ws-connect",
    "${var.environment}-graphql-ws-disconnect",
    "${var.environment}-graphql-ws-message"
  ])
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each            = local.lambda_function_names
  alarm_name          = "${each.value}-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each            = local.lambda_function_names
  alarm_name          = "${each.value}-throttles"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 1
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    FunctionName = each.value
  }
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_name          = "${var.environment}-graphql-ecs-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.graphql.name
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.environment}-graphql-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.environment}-graphql-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Maximum"
  threshold           = var.rds_connection_alarm_threshold
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.environment}-graphql-platform"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "ECS CPU"
          region  = var.aws_region
          metrics = [["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.main.name, "ServiceName", aws_ecs_service.graphql.name]]
          period  = 60
        }
      },
      {
        type = "metric"
        properties = {
          title   = "API Gateway 5xx"
          region  = var.aws_region
          metrics = [["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.graphql.id, "Stage", aws_apigatewayv2_stage.graphql.name]]
          period  = 60
        }
      },
      {
        type = "metric"
        properties = {
          title  = "API Gateway 5xx and latency"
          region = var.aws_region
          metrics = [
            ["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.graphql.id, "Stage", aws_apigatewayv2_stage.graphql.name],
            ["AWS/ApiGateway", "Latency", "ApiId", aws_apigatewayv2_api.graphql.id, "Stage", aws_apigatewayv2_stage.graphql.name]
          ]
          period = 60
        }
      },
      {
        type = "metric"
        properties = {
          title  = "RDS connections and CPU"
          region = var.aws_region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.main.identifier],
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.main.identifier]
          ]
          period = 60
        }
      }
    ]
  })
}

data "aws_iam_policy_document" "github_oidc" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:aadarsh-ui@126157583/bitcot_assessment@1470168053:environment:${var.environment}"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${var.environment}-graphql-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_oidc.json
}
