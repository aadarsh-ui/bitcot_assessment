import { describe, expect, it } from "vitest";
import { authenticate } from "./auth.js";

describe("authenticate", () => {
  it("rejects missing authorization", async () => {
    await expect(authenticate(undefined)).rejects.toThrow("UNAUTHENTICATED");
  });
  it("accepts only the test identity outside production", async () => {
    process.env.NODE_ENV = "test";
    await expect(authenticate("Bearer test-token")).resolves.toBe("00000000-0000-4000-8000-000000000001");
  });
});
