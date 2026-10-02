import { describe, expect, it } from "vitest";
import { requireUpstashCredentials } from "./upstash-credentials";

const COMMAND = "pnpm some:script";

describe("requireUpstashCredentials", () => {
  it("throws an error naming UPSTASH_VECTOR_REST_URL when the variable is missing", () => {
    expect(() =>
      requireUpstashCredentials({ env: { UPSTASH_VECTOR_REST_TOKEN: "token" }, command: COMMAND }),
    ).toThrow(/UPSTASH_VECTOR_REST_URL/);
  });

  it("throws an error naming UPSTASH_VECTOR_REST_TOKEN when the variable is missing", () => {
    expect(() =>
      requireUpstashCredentials({
        env: { UPSTASH_VECTOR_REST_URL: "https://example.upstash.io" },
        command: COMMAND,
      }),
    ).toThrow(/UPSTASH_VECTOR_REST_TOKEN/);
  });

  it("names the command that needs the credentials in the error", () => {
    expect(() => requireUpstashCredentials({ env: {}, command: COMMAND })).toThrow(COMMAND);
  });

  it("returns the trimmed credentials when both variables are set", () => {
    expect(
      requireUpstashCredentials({
        env: {
          UPSTASH_VECTOR_REST_URL: " https://example.upstash.io ",
          UPSTASH_VECTOR_REST_TOKEN: " token ",
        },
        command: COMMAND,
      }),
    ).toEqual({
      url: "https://example.upstash.io",
      token: "token",
    });
  });
});
