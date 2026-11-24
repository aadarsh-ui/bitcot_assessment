import type { Context } from "aws-lambda";
import { getPrisma } from "../shared/db.js";
export async function handler(event:{userId?:string;id?:string},context:Context){
  if(!event.userId||!event.id) throw new Error("INVALID_REQUEST");
  const db=await getPrisma();
  const task=await db.task.findFirst({where:{id:event.id,userId:event.userId}});
  console.log(JSON.stringify({level:"INFO",operation:"getTaskById",awsRequestId:context.awsRequestId,found:!!task}));
  return {task};
}
