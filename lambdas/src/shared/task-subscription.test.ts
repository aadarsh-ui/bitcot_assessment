import { describe, expect, it } from "vitest";
import { executeTaskSubscription, parseTaskSubscription } from "./task-subscription.js";

describe("taskChanged GraphQL subscription", () => {
  it("accepts only a valid taskChanged subscription", () => {
    expect(() => parseTaskSubscription("subscription { taskChanged { id title status } }")).not.toThrow();
    expect(() => parseTaskSubscription("query { taskChanged { id } }")).toThrow("Only GraphQL subscription operations are supported");
    expect(() => parseTaskSubscription("subscription { unknown { id } }")).toThrow("Only the taskChanged subscription is supported");
    expect(() => parseTaskSubscription("subscription { taskChanged { missingField } }")).toThrow("Cannot query field");
  });

  it("executes the stored selection set to produce a GraphQL-shaped result", async () => {
    const result = await executeTaskSubscription(
      "subscription TaskChanged { taskChanged { id title deleted } }",
      undefined,
      { id: "task-1", title: "Test", status: "TODO", deleted: false }
    );
    expect(result).toEqual({ data: { taskChanged: { id: "task-1", title: "Test", deleted: false } } });
  });
});
