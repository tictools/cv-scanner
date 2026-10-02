import { describe, expect, it } from "vitest";
import { requireOpenAiApiKey, requireUpstashCredentials } from "./agent-env";

describe("requireOpenAiApiKey", () => {
  it("throws an error naming OPENAI_API_KEY when the variable is missing", () => {
    expect(() =>
      requireOpenAiApiKey({ OPENAI_API_KEY: "" }),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("throws an error naming OPENAI_API_KEY when the variable is whitespace-only", () => {
    expect(() =>
      requireOpenAiApiKey({ OPENAI_API_KEY: "   " }),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("returns the trimmed key when present", () => {
    expect(requireOpenAiApiKey({ OPENAI_API_KEY: " sk-test-key " })).toBe("sk-test-key");
  });
});

describe("requireUpstashCredentials", () => {
  it("reads the Upstash pair off the Env binding object, not process.env", () => {
    const originalUrl = process.env.UPSTASH_VECTOR_REST_URL;
    const originalToken = process.env.UPSTASH_VECTOR_REST_TOKEN;
    process.env.UPSTASH_VECTOR_REST_URL = "https://process-env.upstash.io";
    process.env.UPSTASH_VECTOR_REST_TOKEN = "process-env-token";

    try {
      const credentials = requireUpstashCredentials({
        UPSTASH_VECTOR_REST_URL: "https://binding.upstash.io",
        UPSTASH_VECTOR_REST_TOKEN: "binding-token",
      });

      expect(credentials).toEqual({
        url: "https://binding.upstash.io",
        token: "binding-token",
      });
    } finally {
      process.env.UPSTASH_VECTOR_REST_URL = originalUrl;
      process.env.UPSTASH_VECTOR_REST_TOKEN = originalToken;
    }
  });

  it("throws an error naming the missing variable and pnpm dev:agent", () => {
    expect(() =>
      requireUpstashCredentials({ UPSTASH_VECTOR_REST_URL: "https://binding.upstash.io", UPSTASH_VECTOR_REST_TOKEN: " " }),
    ).toThrow(/UPSTASH_VECTOR_REST_TOKEN.*pnpm dev:agent/);
  });
});
