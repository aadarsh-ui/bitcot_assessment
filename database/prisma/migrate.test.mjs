import { describe, expect, it } from "vitest";
import { buildDatabaseUrl } from "./migrate.mjs";

describe("buildDatabaseUrl", () => {
  it("uses the supplied endpoint and safely encodes credentials", () => {
    const url = buildDatabaseUrl(JSON.stringify({
      username: "db user",
      password: "p@ss/word",
      host: "secret-host.example",
      port: 5432,
      dbname: "task_platform"
    }), "private-db.example");

    expect(url).toBe("postgresql://db%20user:p%40ss%2Fword@private-db.example:5432/task_platform?sslmode=require");
  });

  it("rejects malformed or incomplete secrets without exposing secret contents", () => {
    expect(() => buildDatabaseUrl("not-json")).toThrow("DATABASE_SECRET_INVALID_JSON");
    expect(() => buildDatabaseUrl(JSON.stringify({ username: "admin" }))).toThrow("DATABASE_SECRET_MISSING_REQUIRED_FIELDS");
  });
});
