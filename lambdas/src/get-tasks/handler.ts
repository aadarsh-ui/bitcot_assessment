import type { Context } from "aws-lambda";
import { getPrisma } from "../shared/db.js";

export async function handler(event: { userId?: string }, context: Context) {
  if (!event.userId) throw new Error("UNAUTHENTICATED");
  const db = await getPrisma();
  const tasks = await db.task.findMany({ where: { userId: event.userId }, orderBy: { createdAt: "desc" } });
  console.log(JSON.stringify({ level:"INFO", operation:"getTasks", awsRequestId:context.awsRequestId, count:tasks.length }));
  return { tasks };
}
