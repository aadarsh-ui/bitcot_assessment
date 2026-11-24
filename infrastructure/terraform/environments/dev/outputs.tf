output "vpc_id" {
  value = aws_vpc.main.id
}

output "app_subnet_ids" {
  value = [aws_subnet.app_a.id, aws_subnet.app_b.id]
}

output "lambda_security_group_id" {
  value = aws_security_group.lambda.id
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "database_secret_arn" {
  value = local.database_secret_arn
}

output "database_endpoint" {
  value = local.database_endpoint
}

output "ecr_repository_url" {
  value = aws_ecr_repository.graphql.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.graphql.name
}

output "ecs_task_definition_family" {
  value = aws_ecs_task_definition.graphql.family
}

output "graphql_api_endpoint" {
  value = "${aws_apigatewayv2_api.graphql.api_endpoint}/graphql"
}

output "graphql_http_api_id" {
  value = aws_apigatewayv2_api.graphql.id
}

output "graphql_vpc_link_id" {
  value = aws_apigatewayv2_vpc_link.graphql.id
}

output "graphql_cloud_map_service_arn" {
  value = aws_service_discovery_service.graphql.arn
}

output "frontend_bucket_name" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
}

output "sns_topic_arn" {
  value = aws_sns_topic.alerts.arn
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}
