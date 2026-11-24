import type { Context } from "aws-lambda";
import { getPrisma } from "../shared/db.js";
export async function handler(event:{userId?:string;id?:string;input?:any},context:Context){
  if(!event.userId||!event.id||!event.input||Object.keys(event.input).length===0) throw new Error("INVALID_REQUEST");
  const db=await getPrisma();
  const existing=await db.task.findFirst({where:{id:event.id,userId:event.userId}});
  if(!existing) throw new Error("TASK_NOT_FOUND");
  const data={...event.input,dueDate:event.input.dueDate===undefined?undefined:event.input.dueDate?new Date(event.input.dueDate):null};
  const task=await db.task.update({where:{id:event.id},data});
  console.log(JSON.stringify({level:"INFO",operation:"updateTask",awsRequestId:context.awsRequestId,taskId:task.id}));
  return {task};
}
