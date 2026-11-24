import { GraphQLError } from "graphql";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { PubSub } from "graphql-subscriptions";
import { prisma, databaseHealth as directDatabaseHealth } from "./db.js";

export const pubsub = new PubSub();
const lambda = new LambdaClient({ region: process.env.AWS_REGION ?? "ap-south-1" });

const formatTask = (task: any) => ({
  ...task,
  dueDate: task.dueDate?.toISOString?.() ?? task.dueDate ?? null,
  createdAt: task.createdAt?.toISOString?.() ?? task.createdAt,
  updatedAt: task.updatedAt?.toISOString?.() ?? task.updatedAt
});

async function invoke(name: string | undefined, payload: object) {
  if (!name) throw new GraphQLError("Lambda function is not configured", { extensions: { code: "SERVICE_CONFIGURATION_ERROR" } });
  const result = await lambda.send(new InvokeCommand({
    FunctionName: name,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload))
  }));
  if (result.FunctionError) throw new GraphQLError("Task operation failed", { extensions: { code: "INTERNAL_ERROR" } });
  const body = JSON.parse(Buffer.from(result.Payload ?? []).toString("utf8"));
  if (body.errorCode) throw new GraphQLError(body.message ?? "Task operation failed", { extensions: { code: body.errorCode } });
  return body;
}

async function publishTaskEvent(task: unknown, userId: string) {
  if (process.env.USE_AWS_LAMBDAS !== "true") {
    await pubsub.publish("TASK_CHANGED", { taskChanged: task });
    return;
  }

  const functionName = process.env.PUBLISH_TASK_EVENT_FUNCTION_NAME;
  if (!functionName) {
    throw new GraphQLError("Task event publisher is not configured", { extensions: { code: "SERVICE_CONFIGURATION_ERROR" } });
  }
  const result = await lambda.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify({ task, userId }))
  }));
  if (result.StatusCode !== 202) {
    throw new GraphQLError("Unable to enqueue task event", { extensions: { code: "EVENT_PUBLISH_FAILED" } });
  }
}

async function ensureUser(userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: "Assessment User", email: `${userId}@local.test` }
  });
}

async function localOperation(operation: "list" | "get" | "create" | "update" | "delete", userId: string, args: any = {}) {
  await ensureUser(userId);
  if (operation === "list") return (await prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })).map(formatTask);
  if (operation === "get") return formatTask(await prisma.task.findFirst({ where: { id: args.id, userId } }));
  if (operation === "create") return formatTask(await prisma.task.create({ data: {
    title: args.input.title.trim(), description: args.input.description ?? null,
    priority: args.input.priority ?? "MEDIUM", dueDate: args.input.dueDate ? new Date(args.input.dueDate) : null, userId
  }}));
  if (operation === "update") {
    const existing = await prisma.task.findFirst({ where: { id: args.id, userId } });
    if (!existing) throw new GraphQLError("Task not found", { extensions: { code: "NOT_FOUND" } });
    return formatTask(await prisma.task.update({
      where: { id: existing.id }, data: { ...args.input, dueDate: args.input.dueDate === undefined ? undefined : args.input.dueDate ? new Date(args.input.dueDate) : null }
    }));
  }
  await prisma.task.deleteMany({ where: { id: args.id, userId } });
  return true;
}

export function createResolvers() {
  const useLambda = process.env.USE_AWS_LAMBDAS === "true";
  const user = (context: any) => {
    if (!context.userId) throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
    return context.userId;
  };
  const operation = async (kind: "list"|"get"|"create"|"update"|"delete", context: any, args: any) => {
    const userId = user(context);
    if (!useLambda) return localOperation(kind, userId, args);
    const envNames: Record<string, string> = {
      list: "GET_TASKS_FUNCTION_NAME", get: "GET_TASK_FUNCTION_NAME",
      create: "CREATE_TASK_FUNCTION_NAME", update: "UPDATE_TASK_FUNCTION_NAME", delete: "DELETE_TASK_FUNCTION_NAME"
    };
    const response = await invoke(process.env[envNames[kind]], { userId, ...args });
    return kind === "list" ? response.tasks : kind === "delete" ? response.deleted : response.task;
  };

  return {
    Query: {
      getTasks: (_: unknown, __: unknown, context: any) => operation("list", context, {}),
      getTaskById: (_: unknown, args: { id: string }, context: any) => operation("get", context, args),
      databaseHealth: async () => directDatabaseHealth()
    },
    Mutation: {
      createTask: async (_: unknown, args: { input: any }, context: any) => {
        const task = await operation("create", context, args);
        await publishTaskEvent(task, user(context));
        return task;
      },
      updateTask: async (_: unknown, args: { id: string; input: any }, context: any) => {
        const task = await operation("update", context, args);
        await publishTaskEvent(task, user(context));
        return task;
      },
      deleteTask: async (_: unknown, args: { id: string }, context: any) => {
        const deleted = await operation("delete", context, args);
        if (deleted) {
          const taskChanged = {
            id: args.id, title: "deleted", status: "COMPLETED", priority: "LOW",
            description: null, dueDate: null, createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(), deleted: true
          };
          await publishTaskEvent(taskChanged, user(context));
        }
        return deleted;
      }
    },
    Subscription: {
      taskChanged: {
        subscribe: () => pubsub.asyncIterator(["TASK_CHANGED"])
      }
    }
  };
}
