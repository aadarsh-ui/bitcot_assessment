# Monitoring and Alerts

The dev environment uses CloudWatch Logs, metrics, alarms, and a dashboard. CloudWatch alarm actions publish to an SNS topic; an SNS email subscription is managed outside Terraform and should be confirmed for the recipient account.

## Monitored services

- **API Gateway:** HTTP API 5xx and p95 latency. The latency alarm threshold is 2 seconds across three one-minute periods.
- **Lambda:** errors and throttles for the nine application functions.
- **ECS:** CPU utilization and running-task health.
- **RDS:** CPU utilization and database connections.
- **Logs:** Lambda logs have 14-day retention; ECS application logs use the Terraform-configured retention.
- **Dashboard:** API errors/latency, ECS CPU, RDS connections/CPU, and Lambda invocations/errors.

Alarms send notifications to the dev SNS topic. Low-traffic API and Lambda alarms treat missing data as non-breaching to avoid idle functions remaining in `INSUFFICIENT_DATA`. This behavior does not suppress actual breaching datapoints. At the last verification, all 24 dev alarms were `OK`; the latency alarm had a recent non-breaching datapoint.

## WebSocket stale connections

API Gateway can return `GoneException` (HTTP 410) when a client disconnects before a server acknowledgement or event delivery. The WebSocket handlers remove stale connection records and treat that response as an expected disconnect. Other delivery errors continue to surface.

## Operations checklist

1. Inspect the CloudWatch dashboard and current alarm state.
2. For `ALARM`, read the alarm reason and correlated service logs before changing thresholds.
3. Confirm SNS has an active subscription and test notification delivery in dev.
4. Do not interpret `INSUFFICIENT_DATA` on an idle metric as proof of health; check whether datapoints are expected and inspect service health separately.
5. Never include secret values, bearer tokens, or full database URLs in logs or screenshots.
