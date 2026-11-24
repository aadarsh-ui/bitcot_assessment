import type { Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function handler(event:{task:object;userId?:string}, context:Context){
  if(!event.task||!event.userId) throw new Error("INVALID_REQUEST");
  const result=await client.send(new ScanCommand({TableName:process.env.CONNECTIONS_TABLE,FilterExpression:"attribute_exists(subscriptionId)"}));
  const api=new ApiGatewayManagementApiClient({endpoint:process.env.WS_MANAGEMENT_ENDPOINT,region:process.env.AWS_REGION});
  let delivered=0;
  for(const item of result.Items??[]){
    if(item.userId!==event.userId) continue;
    try{
      await api.send(new PostToConnectionCommand({ConnectionId:item.connectionId,Data:Buffer.from(JSON.stringify({id:item.subscriptionId,type:"next",payload:{data:{taskChanged:event.task}}}))}));
      delivered++;
    }catch(error){
      const code=(error as any)?.name==="GoneException"?"STALE_CONNECTION":"DELIVERY_FAILED";
      console.error(JSON.stringify({level:"ERROR",operation:"publishTaskEvent",awsRequestId:context.awsRequestId,errorCode:code}));
    }
  }
  console.log(JSON.stringify({level:"INFO",operation:"publishTaskEvent",awsRequestId:context.awsRequestId,delivered}));
  return {delivered};
}
