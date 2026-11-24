import { gql } from "@apollo/client";

export const GET_TASKS = gql`query GetTasks { getTasks { id title description status priority dueDate createdAt updatedAt } }`;
export const CREATE_TASK = gql`mutation CreateTask($input: CreateTaskInput!) { createTask(input:$input) { id title description status priority dueDate createdAt updatedAt } }`;
export const UPDATE_TASK = gql`mutation UpdateTask($id:ID!,$input:UpdateTaskInput!) { updateTask(id:$id,input:$input) { id title description status priority dueDate createdAt updatedAt } }`;
export const DELETE_TASK = gql`mutation DeleteTask($id:ID!) { deleteTask(id:$id) }`;
export const TASK_CHANGED = gql`subscription TaskChanged { taskChanged { id title status priority deleted } }`;
