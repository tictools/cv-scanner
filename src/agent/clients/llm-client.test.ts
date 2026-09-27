import { describe, expect, it, vi } from "vitest";
import { OPENAI_MODEL_ID, createLlmClient } from "./llm-client";

const { mockCreateOpenAI, mockProvider } = vi.hoisted(() => {
  const mockProvider = vi.fn((modelId: string) => ({ modelId, provider: "openai" }));
  return {
    mockCreateOpenAI: vi.fn(() => mockProvider),
    mockProvider,
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: mockCreateOpenAI,
}));

describe("createLlmClient", () => {
  it("builds the OpenAI provider from the given API key", () => {
    createLlmClient({ apiKey: "sk-test" });

    expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: "sk-test" });
  });

  it("returns a model for the pinned model id", () => {
    const model = createLlmClient({ apiKey: "sk-test" });

    expect(mockProvider).toHaveBeenCalledWith(OPENAI_MODEL_ID);
    expect(model).toEqual({ modelId: OPENAI_MODEL_ID, provider: "openai" });
  });

  it("pins the dated snapshot, not the floating alias", () => {
    expect(OPENAI_MODEL_ID).toBe("gpt-5.4-mini-2026-03-17");
  });
});
