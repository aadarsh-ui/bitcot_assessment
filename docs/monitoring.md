# Monitoring

The target no-ALB design monitors API Gateway HTTP/WebSocket APIs, ECS, Lambda, and RDS with CloudWatch Logs, Metrics, Dashboards, and Alarms; SNS delivers actionable alerts. Configure an SNS email subscription out-of-band.

Required signals:

- API Gateway: request count, latency, 4xx/5xx, throttles, and integration failures.
- ECS/Fargate: CPU, memory, desired/running task count, deployment failures, and service events.
- Lambda: invocations, errors, duration, throttles, and concurrent executions.
- RDS: connections, CPU, free storage, freeable memory, and read/write latency.
- Application logs: structured timestamp, level, service, environment, request ID, operation, duration, and safe error code. Never log credentials, tokens, database URLs, or sensitive payloads.

Set thresholds using a measured baseline and database connection budget. Test at least one development alarm and record SNS delivery. Terraform now defines API Gateway, ECS, Lambda, and RDS alarms, but SNS delivery and metric availability must be verified after deployment.
