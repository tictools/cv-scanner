import { describe, expect, it, vi } from "vitest";
import { ScannerAgent } from "./scanner-agent";

const { mockCreateLlmClient, mockStreamAgent } = vi.hoisted(() => ({
  mockCreateLlmClient: vi.fn(),
  mockStreamAgent: vi.fn(),
}));

vi.mock("@cloudflare/ai-chat", () => ({
  AIChatAgent: class {},
}));

vi.mock("../clients/llm-client", () => ({
  createLlmClient: mockCreateLlmClient,
}));

vi.mock("../orchestration/query", () => ({
  streamAgent: mockStreamAgent,
}));

describe("ScannerAgent.onChatMessage", () => {
  it("builds the model from the client seam and passes it, with this.messages, to streamAgent", async () => {
    const fakeModel = { modelId: "gpt-5.4-mini-2026-03-17" };
    mockCreateLlmClient.mockReturnValue(fakeModel);
    const fakeResponse = new Response("stream");
    mockStreamAgent.mockResolvedValue({
      toUIMessageStreamResponse: () => fakeResponse,
    });
    const messages = [{ id: "m1", role: "user" as const, parts: [{ type: "text" as const, text: "hi" }] }];
    const fakeThis = {
      env: {
        OPENAI_API_KEY: "sk-test",
        UPSTASH_VECTOR_REST_URL: "https://example.upstash.io",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      },
      messages,
    };

    const response = await ScannerAgent.prototype.onChatMessage.call(fakeThis);

    expect(mockCreateLlmClient).toHaveBeenCalledWith({ apiKey: "sk-test" });
    expect(mockStreamAgent).toHaveBeenCalledWith({
      model: fakeModel,
      messages,
      credentials: { url: "https://example.upstash.io", token: "token" },
    });
    expect(response).toBe(fakeResponse);
  });

  it("fails fast naming OPENAI_API_KEY when it is missing, before calling the client or streamAgent", async () => {
    const fakeThis = {
      env: {
        OPENAI_API_KEY: "",
        UPSTASH_VECTOR_REST_URL: "https://example.upstash.io",
        UPSTASH_VECTOR_REST_TOKEN: "token",
      },
      messages: [],
    };

    await expect(ScannerAgent.prototype.onChatMessage.call(fakeThis)).rejects.toThrow(
      /OPENAI_API_KEY/,
    );
    expect(mockCreateLlmClient).not.toHaveBeenCalled();
    expect(mockStreamAgent).not.toHaveBeenCalled();
  });
});
