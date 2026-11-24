import { gql } from "graphql-tag";

export const typeDefs = gql`
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
  input CreateTaskInput {
    title: String!
    description: String
    priority: TaskPriority
    dueDate: String
  }
  input UpdateTaskInput {
    title: String
    description: String
    status: TaskStatus
    priority: TaskPriority
    dueDate: String
  }
  type Query {
    getTasks: [Task!]!
    getTaskById(id: ID!): Task
    databaseHealth: Boolean!
  }
  type Mutation {
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!
  }
  type Subscription { taskChanged: Task! }
`;
