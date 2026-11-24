export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface TaskRepository {
  listByUser(userId: string): Promise<Task[]>;
  findByIdForUser(id: string, userId: string): Promise<Task | null>;
  create(userId: string, input: CreateTaskInput): Promise<Task>;
  update(id: string, userId: string, input: UpdateTaskInput): Promise<Task>;
  delete(id: string, userId: string): Promise<boolean>;
}

export class TaskService {
  constructor(private repository: TaskRepository) {}

  validateInput(input: CreateTaskInput | UpdateTaskInput): void {
    if ("title" in input && input.title !== undefined) {
      if (typeof input.title !== "string" || input.title.trim().length < 1 || input.title.length > 200) {
        throw new Error("INVALID_TITLE");
      }
    }
    if ("status" in input && input.status !== undefined &&
        !["TODO", "IN_PROGRESS", "COMPLETED"].includes(input.status)) throw new Error("INVALID_STATUS");
    if ("priority" in input && input.priority !== undefined &&
        !["LOW", "MEDIUM", "HIGH"].includes(input.priority)) throw new Error("INVALID_PRIORITY");
  }

  list(userId: string) { return this.repository.listByUser(userId); }
  get(id: string, userId: string) { return this.repository.findByIdForUser(id, userId); }
  create(userId: string, input: CreateTaskInput) {
    this.validateInput(input);
    if (!input.title?.trim()) throw new Error("INVALID_TITLE");
    return this.repository.create(userId, { ...input, title: input.title.trim() });
  }
  update(id: string, userId: string, input: UpdateTaskInput) {
    this.validateInput(input);
    if (Object.keys(input).length === 0) throw new Error("INVALID_UPDATE");
    return this.repository.update(id, userId, input);
  }
  delete(id: string, userId: string) { return this.repository.delete(id, userId); }
}
