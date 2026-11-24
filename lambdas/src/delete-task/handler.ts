import type { Context } from "aws-lambda";
import { getPrisma } from "../shared/db.js";
export async function handler(event:{userId?:string;id?:string},context:Context){
  if(!event.userId||!event.id) throw new Error("INVALID_REQUEST");
  const db=await getPrisma();
  const result=await db.task.deleteMany({where:{id:event.id,userId:event.userId}});
  console.log(JSON.stringify({level:"INFO",operation:"deleteTask",awsRequestId:context.awsRequestId,taskId:event.id}));
  return {deleted:result.count===1};
}
