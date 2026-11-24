import { describe, expect, it } from "vitest";
import { GET_TASKS, CREATE_TASK, TASK_CHANGED } from "./graphql";

describe("GraphQL documents", () => {
  it("includes task fields in the list query", () => {
    expect(GET_TASKS.loc?.source.body).toContain("getTasks");
  });
  it("defines task creation and subscription operations", () => {
    expect(CREATE_TASK.loc?.source.body).toContain("createTask");
    expect(TASK_CHANGED.loc?.source.body).toContain("taskChanged");
  });
});
