locals {
  sam_artifacts_bucket_name      = "${var.environment}-graphql-sam-artifacts-${data.aws_caller_identity.current.account_id}"
  sam_artifacts_bucket_arn       = "arn:${data.aws_partition.current.partition}:s3:::${local.sam_artifacts_bucket_name}"
  github_cloudformation_role_arn = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/${var.environment}-graphql-cloudformation-deploy"
}

data "aws_iam_policy_document" "github_plan_assume_role" {
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
      values   = ["repo:${var.github_repository}:environment:${var.environment}"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:ref"
      values   = ["refs/pull/*/merge"]
    }
  }
}

resource "aws_iam_role" "github_plan" {
  name               = "${var.environment}-graphql-github-plan"
  assume_role_policy = data.aws_iam_policy_document.github_plan_assume_role.json
}

resource "aws_iam_role_policy_attachment" "github_plan_readonly" {
  role       = aws_iam_role.github_plan.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/ReadOnlyAccess"
}

resource "aws_s3_bucket" "sam_artifacts" {
  bucket = local.sam_artifacts_bucket_name
}

resource "aws_s3_bucket_public_access_block" "sam_artifacts" {
  bucket                  = aws_s3_bucket.sam_artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sam_artifacts" {
  bucket = aws_s3_bucket.sam_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "github_cloudformation" {
  name = "${var.environment}-graphql-cloudformation-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudformation.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

data "aws_iam_policy_document" "github_cloudformation" {
  statement {
    sid = "ManageDevGraphqlLambdaFunctions"
    actions = [
      "lambda:AddPermission",
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:GetPolicy",
      "lambda:ListTags",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${var.environment}-graphql-*"]
  }

  statement {
    sid = "ManageDevGraphqlWebSocketApi"
    actions = [
      "apigateway:DELETE",
      "apigateway:GET",
      "apigateway:PATCH",
      "apigateway:POST",
      "apigateway:PUT"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*"]
  }

  statement {
    sid = "ManageDevGraphqlConnectionsTable"
    actions = [
      "dynamodb:CreateTable",
      "dynamodb:DeleteTable",
      "dynamodb:DescribeTable",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:UpdateTable"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.environment}-graphql-connections"]
  }

  statement {
    sid = "ManageGeneratedLambdaRoles"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListAttachedRolePolicies",
      "iam:ListRolePolicies",
      "iam:PutRolePolicy",
      "iam:TagRole",
      "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/graphql-serverless-${var.environment}-*"]
  }

  statement {
    sid       = "PassGeneratedRolesToLambda"
    actions   = ["iam:PassRole"]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/graphql-serverless-${var.environment}-*"]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  statement {
    sid = "AttachApprovedLambdaExecutionPolicies"
    actions = [
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy"
    ]
    resources = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/graphql-serverless-${var.environment}-*"]
    condition {
      test     = "ArnEquals"
      variable = "iam:PolicyARN"
      values = [
        "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        "arn:${data.aws_partition.current.partition}:iam::aws:policy/AWSXRayDaemonWriteAccess"
      ]
    }
  }

  statement {
    sid       = "ReadSamDeploymentArtifacts"
    actions   = ["s3:GetObject"]
    resources = ["${local.sam_artifacts_bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "github_cloudformation" {
  name   = "${var.environment}-graphql-cloudformation-deploy"
  role   = aws_iam_role.github_cloudformation.id
  policy = data.aws_iam_policy_document.github_cloudformation.json
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "AuthenticateToEcr"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "PushDevGraphqlImage"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart"
    ]
    resources = [aws_ecr_repository.graphql.arn]
  }

  statement {
    sid = "RegisterAndRunDevTasks"
    actions = [
      "ecs:DescribeTaskDefinition",
      "ecs:RegisterTaskDefinition",
      "ecs:RunTask"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${aws_ecs_task_definition.graphql.family}:*",
      "arn:${data.aws_partition.current.partition}:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:task-definition/${aws_ecs_task_definition.migration.family}:*",
      aws_ecs_cluster.main.arn
    ]
  }

  statement {
    sid       = "InspectDevTasks"
    actions   = ["ecs:DescribeTasks"]
    resources = ["*"]
  }

  statement {
    sid = "UpdateOnlyDevGraphqlService"
    actions = [
      "ecs:DescribeServices",
      "ecs:UpdateService"
    ]
    resources = [aws_ecs_service.graphql.id]
  }

  statement {
    sid     = "PassEcsRoles"
    actions = ["iam:PassRole"]
    resources = [
      aws_iam_role.ecs_execution.arn,
      aws_iam_role.ecs_task.arn,
      aws_iam_role.migration_task.arn
    ]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["ecs-tasks.amazonaws.com"]
    }
  }

  statement {
    sid       = "PassCloudFormationExecutionRole"
    actions   = ["iam:PassRole"]
    resources = [local.github_cloudformation_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["cloudformation.amazonaws.com"]
    }
  }

  statement {
    sid = "ManageOnlyDevServerlessStack"
    actions = [
      "cloudformation:CreateChangeSet",
      "cloudformation:DeleteChangeSet",
      "cloudformation:DescribeChangeSet",
      "cloudformation:DescribeStackEvents",
      "cloudformation:DescribeStacks",
      "cloudformation:ExecuteChangeSet",
      "cloudformation:GetTemplate",
      "cloudformation:ListStackResources"
    ]
    resources = [
      "arn:${data.aws_partition.current.partition}:cloudformation:${var.aws_region}:${data.aws_caller_identity.current.account_id}:stack/graphql-serverless-${var.environment}/*",
      "arn:${data.aws_partition.current.partition}:cloudformation:${var.aws_region}:${data.aws_caller_identity.current.account_id}:changeSet/*/*"
    ]
  }

  statement {
    sid       = "ListCloudFormationStacks"
    actions   = ["cloudformation:ListStacks"]
    resources = ["*"]
  }

  statement {
    sid = "UploadSamDeploymentArtifacts"
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket"
    ]
    resources = [local.sam_artifacts_bucket_arn]
  }

  statement {
    sid = "UploadSamDeploymentObjects"
    actions = [
      "s3:AbortMultipartUpload",
      "s3:GetObject",
      "s3:ListMultipartUploadParts",
      "s3:PutObject"
    ]
    resources = ["${local.sam_artifacts_bucket_arn}/*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.environment}-graphql-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
