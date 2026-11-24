import type { APIGatewayProxyEvent, Context } from "aws-lambda";

export async function handler(_event: APIGatewayProxyEvent, context: Context) {
  console.log(JSON.stringify({
    level: "INFO",
    operation: "wsConnect",
    awsRequestId: context.awsRequestId
  }));
  return { statusCode: 200, body: "Connected" };
}
