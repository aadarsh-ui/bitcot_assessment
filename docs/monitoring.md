# Monitoring

The target no-ALB design monitors API Gateway HTTP/WebSocket APIs, ECS, Lambda, and RDS with CloudWatch Logs, Metrics, Dashboards, and Alarms; SNS delivers actionable alerts. Configure an SNS email subscription out-of-band.

Required signals:

- API Gateway: request count, latency, 4xx/5xx, throttles, and integration failures.
- ECS/Fargate: CPU, memory, desired/running task count, deployment failures, and service events.
- Lambda: invocations, errors, duration, throttles, and concurrent executions.
- RDS: connections, CPU, free storage, freeable memory, and read/write latency.
- Application logs: structured timestamp, level, service, environment, request ID, operation, duration, and safe error code. Never log credentials, tokens, database URLs, or sensitive payloads.

Set thresholds using a measured baseline and database connection budget. The dev Terraform config adds an API Gateway p95 latency alarm at 2 seconds sustained for 3 one-minute periods; adjust this threshold from observed traffic baselines. The alarm is deployed and currently reports `INSUFFICIENT_DATA` because no recent API latency datapoints are available; this is not evidence of an active latency breach. Test at least one development alarm and record SNS delivery. The development deploy workflow creates missing SAM Lambda log groups and applies 14-day retention to all nine. Creating groups explicitly is necessary because Lambda normally creates a group's log group only on first invocation.

The WebSocket message-error alarm fired during authenticated subscription testing because API Gateway returned `GoneException` (HTTP 410) when the client had already closed a connection before the server could send its acknowledgement. This is a stale-connection condition, not a failed task operation. The WebSocket handlers now remove the stale connection record and treat that response as expected; other delivery errors still fail visibly. Lambda error/throttle alarms treat missing data as non-breaching so idle functions do not remain in `INSUFFICIENT_DATA`; deployed alarms now report `OK` when no errors or throttles are observed.
