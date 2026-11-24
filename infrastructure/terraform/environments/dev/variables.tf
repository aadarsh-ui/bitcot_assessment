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

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "enable_rds_proxy" {
  type        = bool
  default     = false
  description = "Enable RDS Proxy only when connection/load testing justifies its additional cost"
}

variable "ecs_min_capacity" {
  type    = number
  default = 1
}

variable "ecs_max_capacity" {
  type    = number
  default = 2
}

variable "container_image_tag" {
  type        = string
  default     = "bootstrap"
  description = "Immutable ECR tag used for initial service creation; CI registers later revisions from commit SHAs"
}

variable "api_throttle_rate" {
  type    = number
  default = 20
}

variable "api_throttle_burst" {
  type    = number
  default = 40
}

variable "rds_connection_alarm_threshold" {
  type        = number
  default     = 80
  description = "Initial dev alarm threshold; adjust using the selected RDS class and measured connection budget"
}

variable "jwt_issuer_url" {
  type        = string
  description = "OIDC issuer URL used by the GraphQL service to verify access tokens"
}

variable "jwt_audience" {
  type        = string
  description = "Expected JWT audience for the GraphQL API"
}

variable "github_repository" {
  type    = string
  default = "aadarsh-ui/bitcot_assessment"
}

variable "enable_cloudfront" {
  type        = bool
  default     = false
  description = "Create the CloudFront distribution and OAC after AWS account verification"
}
