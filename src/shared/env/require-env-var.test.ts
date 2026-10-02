import { describe, expect, it } from "vitest";
import { requireEnvVar } from "./require-env-var";

describe("requireEnvVar", () => {
  it("throws an error naming the variable when it is unset", () => {
    expect(() =>
      requireEnvVar({ env: {}, name: "SOME_KEY", command: "pnpm some:script" }),
    ).toThrow(/SOME_KEY/);
  });

  it("throws an error naming the variable when it is whitespace-only", () => {
    expect(() =>
      requireEnvVar({ env: { SOME_KEY: "   " }, name: "SOME_KEY", command: "pnpm some:script" }),
    ).toThrow(/SOME_KEY/);
  });

  it("uses one message format that tells the user which command needs the variable", () => {
    expect(() =>
      requireEnvVar({ env: {}, name: "SOME_KEY", command: "pnpm some:script" }),
    ).toThrow(
      "Missing required environment variable: SOME_KEY. Set it in a local .env file before running pnpm some:script.",
    );
  });

  it("returns the trimmed value when present", () => {
    expect(
      requireEnvVar({ env: { SOME_KEY: " value " }, name: "SOME_KEY", command: "pnpm some:script" }),
    ).toBe("value");
  });
});
