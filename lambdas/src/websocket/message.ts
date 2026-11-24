import type { APIGatewayProxyWebsocketEventV2, Context } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
const db=DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function handler(event:APIGatewayProxyWebsocketEventV2,context:Context){
  let msg:any;
  try{msg=JSON.parse(event.body??"{}")}catch{return{statusCode:400,body:"Invalid message"}}
  const connectionId=event.requestContext.connectionId;
  const record=await db.send(new GetCommand({TableName:process.env.CONNECTIONS_TABLE,Key:{connectionId}}));
  if(!record.Item)return{statusCode:401,body:"Connection not registered"};
  const api=new ApiGatewayManagementApiClient({endpoint:process.env.WS_MANAGEMENT_ENDPOINT,region:process.env.AWS_REGION});
  if(msg.type==="connection_init"){
    await api.send(new PostToConnectionCommand({ConnectionId:connectionId,Data:Buffer.from(JSON.stringify({type:"connection_ack"}))}));
  }else if(msg.type==="subscribe"){
    if(!msg.id||!msg.payload?.query?.includes("taskChanged")){
      await api.send(new PostToConnectionCommand({ConnectionId:connectionId,Data:Buffer.from(JSON.stringify({id:msg.id,type:"error",payload:[{message:"Invalid subscription"}]}))}));
    }else{
      await db.send(new PutCommand({TableName:process.env.CONNECTIONS_TABLE,Item:{connectionId,subscriptionId:msg.id,userId:record.Item.userId,connectedAt:record.Item.connectedAt}}));
    }
  }else if(msg.type==="complete"){
    await db.send(new PutCommand({TableName:process.env.CONNECTIONS_TABLE,Item:{connectionId,userId:record.Item.userId,connectedAt:record.Item.connectedAt}}));
  }else if(msg.type==="ping"){
    await api.send(new PostToConnectionCommand({ConnectionId:connectionId,Data:Buffer.from(JSON.stringify({type:"pong"}))}));
  }
  console.log(JSON.stringify({level:"INFO",operation:"wsMessage",awsRequestId:context.awsRequestId,protocolType:msg.type}));
  return {statusCode:200,body:"OK"};
}
