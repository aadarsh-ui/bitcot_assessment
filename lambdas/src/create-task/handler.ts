import type { Context } from "aws-lambda";
import { getPrisma } from "../shared/db.js";
export async function handler(event:{userId?:string;input?:any},context:Context){
  if(!event.userId||!event.input?.title?.trim()) throw new Error("INVALID_REQUEST");
  if(event.input.title.length>200) throw new Error("INVALID_TITLE");
  const db=await getPrisma();
  await db.user.upsert({where:{id:event.userId},update:{},create:{id:event.userId,name:"Assessment User",email:`${event.userId}@local.test`}});
  const task=await db.task.create({data:{title:event.input.title.trim(),description:event.input.description??null,status:"TODO",priority:event.input.priority??"MEDIUM",dueDate:event.input.dueDate?new Date(event.input.dueDate):null,userId:event.userId}});
  console.log(JSON.stringify({level:"INFO",operation:"createTask",awsRequestId:context.awsRequestId,taskId:task.id}));
  return {task};
}
