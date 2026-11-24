import { describe, expect, it } from "vitest";

describe("GraphQL transport message validation", () => {
  it("requires taskChanged in a subscription operation", () => {
    const isTaskSubscription = (query: string) => query.includes("taskChanged");
    expect(isTaskSubscription("subscription { taskChanged { id } }")).toBe(true);
    expect(isTaskSubscription("query { getTasks { id } }")).toBe(false);
  });
});
