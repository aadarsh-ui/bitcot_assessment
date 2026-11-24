import type { Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { executeTaskSubscription } from "../shared/task-subscription.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

type TaskEvent = { task: Record<string, unknown>; userId?: string };

export async function handler(event: TaskEvent, context: Context) {
  const tableName = process.env.CONNECTIONS_TABLE;
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!event.task || !event.userId || !tableName || !endpoint) throw new Error("INVALID_PUBLISH_CONFIGURATION");
  const api = new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION ?? "ap-south-1"
  });
  let delivered = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await client.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
      FilterExpression: "userId = :userId AND attribute_exists(subscriptions)",
      ExpressionAttributeValues: { ":userId": event.userId }
    }));
    lastEvaluatedKey = result.LastEvaluatedKey;

    for (const item of result.Items ?? []) {
      const subscriptions = item.subscriptions as Record<string, { query: string; variables?: Record<string, unknown> }> | undefined;
      if (!subscriptions || typeof item.connectionId !== "string") continue;
      for (const [subscriptionId, subscription] of Object.entries(subscriptions)) {
        const result = await executeTaskSubscription(subscription.query, subscription.variables, event.task);
        const payload = {
          ...(result.data === undefined ? {} : { data: result.data }),
          ...(result.errors ? { errors: result.errors.map(error => error.toJSON()) } : {})
        };
        try {
          await api.send(new PostToConnectionCommand({
            ConnectionId: item.connectionId,
            Data: Buffer.from(JSON.stringify({ id: subscriptionId, type: "next", payload }))
          }));
          delivered += 1;
        } catch (error) {
          if (error instanceof Error && error.name === "GoneException") {
            await client.send(new DeleteCommand({ TableName: tableName, Key: { connectionId: item.connectionId } }));
            break;
          }
          console.error(JSON.stringify({
            level: "ERROR",
            operation: "publishTaskEvent",
            awsRequestId: context.awsRequestId,
            errorCode: error instanceof Error ? error.name : "DELIVERY_FAILED"
          }));
          throw error;
        }
      }
    }
  } while (lastEvaluatedKey);

  console.log(JSON.stringify({
    level: "INFO",
    operation: "publishTaskEvent",
    awsRequestId: context.awsRequestId,
    delivered
  }));
  return { delivered };
}
