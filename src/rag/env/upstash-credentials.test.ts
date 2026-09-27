import { describe, expect, it } from "vitest";
import { requireUpstashCredentials } from "./upstash-credentials";

describe("requireUpstashCredentials", () => {
  it("throws an error naming UPSTASH_VECTOR_REST_URL when the variable is unset", () => {
    expect(() =>
      requireUpstashCredentials({ UPSTASH_VECTOR_REST_TOKEN: "token" }),
    ).toThrow(/UPSTASH_VECTOR_REST_URL/);
  });

  it("throws an error naming UPSTASH_VECTOR_REST_URL when the variable is whitespace-only", () => {
    expect(() =>
      requireUpstashCredentials({
        UPSTASH_VECTOR_REST_URL: "   ",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      }),
    ).toThrow(/UPSTASH_VECTOR_REST_URL/);
  });

  it("throws an error naming UPSTASH_VECTOR_REST_TOKEN when the variable is unset", () => {
    expect(() =>
      requireUpstashCredentials({ UPSTASH_VECTOR_REST_URL: "https://example.upstash.io" }),
    ).toThrow(/UPSTASH_VECTOR_REST_TOKEN/);
  });

  it("throws an error naming UPSTASH_VECTOR_REST_TOKEN when the variable is whitespace-only", () => {
    expect(() =>
      requireUpstashCredentials({
        UPSTASH_VECTOR_REST_URL: "https://example.upstash.io",
        UPSTASH_VECTOR_REST_TOKEN: "   ",
      }),
    ).toThrow(/UPSTASH_VECTOR_REST_TOKEN/);
  });

  it("returns the credentials when both variables are set", () => {
    expect(
      requireUpstashCredentials({
        UPSTASH_VECTOR_REST_URL: "https://example.upstash.io",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      }),
    ).toEqual({
      url: "https://example.upstash.io",
      token: "token",
    });
  });
});
