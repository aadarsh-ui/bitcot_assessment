import {
  buildSchema,
  execute,
  getOperationAST,
  parse,
  validate,
  type DocumentNode,
  type ExecutionResult
} from "graphql";

const schema = buildSchema(`
  type Query { _empty: Boolean }
  enum TaskStatus { TODO IN_PROGRESS COMPLETED }
  enum TaskPriority { LOW MEDIUM HIGH }
  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    priority: TaskPriority!
    dueDate: String
    createdAt: String!
    updatedAt: String!
    deleted: Boolean
  }
  type Subscription { taskChanged: Task! }
`);

export function parseTaskSubscription(source: string): DocumentNode {
  const document = parse(source);
  const operation = getOperationAST(document);
  if (!operation || operation.operation !== "subscription") {
    throw new Error("Only GraphQL subscription operations are supported");
  }
  const topLevelFields = operation.selectionSet.selections;
  if (topLevelFields.length !== 1 || topLevelFields[0]?.kind !== "Field" || topLevelFields[0].name.value !== "taskChanged") {
    throw new Error("Only the taskChanged subscription is supported");
  }

  const errors = validate(schema, document);
  if (errors.length) throw new Error(errors.map(error => error.message).join("; "));
  return document;
}

export async function executeTaskSubscription(
  source: string,
  variables: Record<string, unknown> | undefined,
  task: unknown
): Promise<ExecutionResult> {
  const document = parseTaskSubscription(source);
  return execute({
    schema,
    document,
    rootValue: { taskChanged: task },
    variableValues: variables
  });
}
