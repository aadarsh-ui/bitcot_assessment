import type { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { executeTaskSubscription, parseTaskSubscription } from "../shared/task-subscription.js";
import { isGoneException } from "../shared/websocket-errors.js";

type ProtocolMessage = {
  id?: unknown;
  type?: unknown;
  payload?: unknown;
};

type SubscriptionOperation = {
  query: string;
  variables?: Record<string, unknown>;
};

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getApiClient() {
  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
  if (!endpoint) throw new Error("WS_MANAGEMENT_ENDPOINT_MISSING");
  return new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION ?? "ap-south-1"
  });
}

async function removeStaleConnection(connectionId: string, requestId: string) {
  const tableName = process.env.CONNECTIONS_TABLE;
  if (!tableName) throw new Error("CONNECTIONS_TABLE_MISSING");
  await db.send(new DeleteCommand({ TableName: tableName, Key: { connectionId } }));
  console.info(JSON.stringify({
    level: "INFO",
    operation: "wsStaleConnection",
    awsRequestId: requestId,
    reason: "GONE_EXCEPTION"
  }));
}

async function post(connectionId: string, message: object, requestId: string) {
  try {
    await getApiClient().send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(message))
    }));
  } catch (error) {
    if (!isGoneException(error)) throw error;
    await removeStaleConnection(connectionId, requestId);
  }
}

async function close(connectionId: string, reason: string, requestId: string) {
  console.warn(JSON.stringify({
    level: "WARN",
    operation: "wsClose",
    awsRequestId: requestId,
    reason
  }));
  try {
    await getApiClient().send(new DeleteConnectionCommand({ ConnectionId: connectionId }));
  } catch (error) {
    if (!isGoneException(error)) throw error;
    await removeStaleConnection(connectionId, requestId);
  }
}

function operationId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

async function authenticate(connectionId: string, payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }
  const params = payload as Record<string, unknown>;
  const authorization = params.Authorization ?? params.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }

  const issuer = process.env.JWT_ISSUER;
  const audience = process.env.JWT_AUDIENCE;
  if (!issuer || !audience) throw new Error("JWT_CONFIGURATION_MISSING");
  jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const { payload: claims } = await jwtVerify(authorization.slice(7), jwks, { issuer, audience });
  if (typeof claims.sub !== "string") throw new Error("INVALID_TOKEN_SUBJECT");

  await db.send(new UpdateCommand({
    TableName: process.env.CONNECTIONS_TABLE,
    Key: { connectionId },
    UpdateExpression: "SET userId = :userId, authenticatedAt = :authenticatedAt, subscriptions = if_not_exists(subscriptions, :empty)",
    ExpressionAttributeValues: {
      ":userId": claims.sub,
      ":authenticatedAt": new Date().toISOString(),
      ":empty": {}
    }
  }));
  return claims.sub;
}

function parseMessage(body: string | null | undefined): ProtocolMessage {
  let message: unknown;
  try {
    message = JSON.parse(body ?? "");
  } catch {
    throw new Error("INVALID_JSON");
  }
  if (!message || typeof message !== "object" || Array.isArray(message) || typeof (message as ProtocolMessage).type !== "string") {
    throw new Error("INVALID_MESSAGE");
  }
  return message as ProtocolMessage;
}

function parseSubscribePayload(message: ProtocolMessage): SubscriptionOperation {
  if (!operationId(message.id)) throw new Error("INVALID_OPERATION_ID");
  if (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) {
    throw new Error("INVALID_SUBSCRIPTION_PAYLOAD");
  }
  const payload = message.payload as Record<string, unknown>;
  if (typeof payload.query !== "string") throw new Error("INVALID_SUBSCRIPTION_QUERY");
  parseTaskSubscription(payload.query);
  if (payload.variables !== undefined && (!payload.variables || typeof payload.variables !== "object" || Array.isArray(payload.variables))) {
    throw new Error("INVALID_SUBSCRIPTION_VARIABLES");
  }
  return {
    query: payload.query,
    ...(payload.variables ? { variables: payload.variables as Record<string, unknown> } : {})
  };
}

export async function handler(event: APIGatewayProxyWebsocketEventV2, context: Context) {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) throw new Error("CONNECTION_ID_MISSING");
  const tableName = process.env.CONNECTIONS_TABLE;
  if (!tableName) throw new Error("CONNECTIONS_TABLE_MISSING");

  let message: ProtocolMessage;
  try {
    message = parseMessage(event.body);
  } catch (error) {
    await close(connectionId, error instanceof Error ? error.message : "INVALID_MESSAGE", context.awsRequestId);
    return { statusCode: 200, body: "Closed invalid connection" };
  }

  if (message.type === "connection_init") {
    const existing = await db.send(new GetCommand({ TableName: tableName, Key: { connectionId } }));
    if (existing.Item?.userId) {
      await close(connectionId, "DUPLICATE_CONNECTION_INIT", context.awsRequestId);
      return { statusCode: 200, body: "Closed duplicate initialization" };
    }
    try {
      await authenticate(connectionId, message.payload);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "UNAUTHENTICATED";
      if (reason === "JWT_CONFIGURATION_MISSING") throw error;
      await close(connectionId, "UNAUTHENTICATED", context.awsRequestId);
      return { statusCode: 200, body: "Closed unauthenticated connection" };
    }
    await post(connectionId, { type: "connection_ack" }, context.awsRequestId);
    return { statusCode: 200, body: "Connection initialized" };
  }

  const record = await db.send(new GetCommand({ TableName: tableName, Key: { connectionId } }));
  if (!record.Item?.userId) {
    await close(connectionId, "CONNECTION_NOT_INITIALIZED", context.awsRequestId);
    return { statusCode: 200, body: "Closed uninitialized connection" };
  }

  if (message.type === "ping") {
    await post(connectionId, { type: "pong", ...(message.payload === undefined ? {} : { payload: message.payload }) }, context.awsRequestId);
  } else if (message.type === "subscribe") {
    let subscription: SubscriptionOperation;
    try {
      subscription = parseSubscribePayload(message);
    } catch (error) {
      await post(connectionId, {
        id: operationId(message.id) ? message.id : undefined,
        type: "error",
        payload: [{ message: error instanceof Error ? error.message : "Invalid subscription" }]
      }, context.awsRequestId);
      return { statusCode: 200, body: "Rejected invalid subscription" };
    }
    await db.send(new UpdateCommand({
      TableName: tableName,
      Key: { connectionId },
      UpdateExpression: "SET subscriptions.#operationId = :operation",
      ExpressionAttributeNames: { "#operationId": message.id as string },
      ExpressionAttributeValues: { ":operation": subscription },
      ConditionExpression: "attribute_exists(userId) AND attribute_not_exists(subscriptions.#operationId)"
    }));
  } else if (message.type === "complete") {
    if (operationId(message.id)) {
      await db.send(new UpdateCommand({
        TableName: tableName,
        Key: { connectionId },
        UpdateExpression: "REMOVE subscriptions.#operationId",
        ExpressionAttributeNames: { "#operationId": message.id },
        ConditionExpression: "attribute_exists(userId)"
      }));
    } else {
      await close(connectionId, "INVALID_OPERATION_ID", context.awsRequestId);
    }
  } else if (message.type === "connection_terminate") {
    await close(connectionId, "CLIENT_TERMINATED", context.awsRequestId);
  } else {
    await close(connectionId, "UNSUPPORTED_PROTOCOL_MESSAGE", context.awsRequestId);
  }

  console.log(JSON.stringify({
    level: "INFO",
    operation: "wsMessage",
    awsRequestId: context.awsRequestId,
    protocolType: message.type
  }));
  return { statusCode: 200, body: "OK" };
}
