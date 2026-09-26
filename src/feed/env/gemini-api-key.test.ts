import { describe, expect, it } from "vitest";
import { requireGeminiApiKey } from "./gemini-api-key";

describe("requireGeminiApiKey", () => {
  it("throws an error naming GEMINI_API_KEY when the variable is unset", () => {
    expect(() => requireGeminiApiKey({})).toThrow(/GEMINI_API_KEY/);
  });

  it("throws an error naming GEMINI_API_KEY when the variable is empty", () => {
    expect(() => requireGeminiApiKey({ GEMINI_API_KEY: "" })).toThrow(/GEMINI_API_KEY/);
    expect(() => requireGeminiApiKey({ GEMINI_API_KEY: "   " })).toThrow(/GEMINI_API_KEY/);
  });

  it("returns the API key when the variable is set", () => {
    expect(requireGeminiApiKey({ GEMINI_API_KEY: "test-key-123" })).toBe("test-key-123");
  });
});
