import { describe, expect, it } from "vitest";
import { isGoneException } from "./websocket-errors.js";

describe("WebSocket API Gateway errors", () => {
  it("recognizes GoneException responses by name or HTTP status", () => {
    const namedError = new Error("connection is gone");
    namedError.name = "GoneException";

    expect(isGoneException(namedError)).toBe(true);
    expect(isGoneException(Object.assign(new Error("gone"), { $metadata: { httpStatusCode: 410 } }))).toBe(true);
  });

  it("does not suppress unrelated failures", () => {
    const error = new Error("access denied");
    error.name = "ForbiddenException";

    expect(isGoneException(error)).toBe(false);
    expect(isGoneException("GoneException")).toBe(false);
  });
});
