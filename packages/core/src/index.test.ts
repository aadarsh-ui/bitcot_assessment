import { describe, expect, it } from "vitest";
import { TaskService, type TaskRepository } from "./index.js";

const repository: TaskRepository = {
  listByUser: async () => [],
  findByIdForUser: async () => null,
  create: async (_userId, input) => ({
    id: "00000000-0000-4000-8000-000000000001", title: input.title,
    description: input.description ?? null, status: "TODO", priority: input.priority ?? "MEDIUM",
    dueDate: input.dueDate ?? null, userId: "test-user", createdAt: "", updatedAt: ""
  }),
  update: async () => { throw new Error(); },
  delete: async () => true
};

describe("TaskService", () => {
  it("rejects an empty title", () => {
    expect(() => new TaskService(repository).create("test-user", { title: "   " })).toThrow("INVALID_TITLE");
  });
  it("trims valid titles", async () => {
    const task = await new TaskService(repository).create("test-user", { title: "  Deploy  " });
    expect(task.title).toBe("Deploy");
  });
});
