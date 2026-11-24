import type { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
const client=DynamoDBDocumentClient.from(new DynamoDBClient({}));
export async function handler(event:APIGatewayProxyWebsocketEventV2,context:Context){
  await client.send(new DeleteCommand({TableName:process.env.CONNECTIONS_TABLE,Key:{connectionId:event.requestContext.connectionId}}));
  console.log(JSON.stringify({level:"INFO",operation:"wsDisconnect",awsRequestId:context.awsRequestId}));
  return {statusCode:200,body:"Disconnected"};
}
