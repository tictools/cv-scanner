import { describe, expect, it, vi } from "vitest";
import { ScannerAgent } from "./scanner-agent";

const { mockCreateLlmClient, mockStreamTurn } = vi.hoisted(() => ({
  mockCreateLlmClient: vi.fn(),
  mockStreamTurn: vi.fn(),
}));

vi.mock("@cloudflare/ai-chat", () => ({
  AIChatAgent: class {},
}));

vi.mock("../clients/llm-client", () => ({
  createLlmClient: mockCreateLlmClient,
}));

vi.mock("../turn/stream-turn", () => ({
  streamTurn: mockStreamTurn,
}));

describe("ScannerAgent.onChatMessage", () => {
  it("builds the model from the client seam and passes it, with this.messages, to streamTurn", async () => {
    const fakeModel = { modelId: "gpt-5.4-mini-2026-03-17" };
    mockCreateLlmClient.mockReturnValue(fakeModel);
    const fakeResponse = new Response("stream");
    mockStreamTurn.mockResolvedValue({
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
    expect(mockStreamTurn).toHaveBeenCalledWith({
      model: fakeModel,
      messages,
      resolveCredentials: expect.any(Function),
    });
    expect(mockStreamTurn.mock.calls[0]![0].resolveCredentials()).toEqual({
      url: "https://example.upstash.io",
      token: "token",
    });
    expect(response).toBe(fakeResponse);
  });

  it("does not validate the Upstash pair up front, leaving a missing variable to surface as a tool error", async () => {
    mockStreamTurn.mockReset();
    mockStreamTurn.mockResolvedValue({ toUIMessageStreamResponse: () => new Response("stream") });
    const fakeThis = {
      env: { OPENAI_API_KEY: "sk-test", UPSTASH_VECTOR_REST_URL: "", UPSTASH_VECTOR_REST_TOKEN: "token" },
      messages: [],
    };

    await ScannerAgent.prototype.onChatMessage.call(fakeThis);

    expect(() => mockStreamTurn.mock.calls[0]![0].resolveCredentials()).toThrow(/UPSTASH_VECTOR_REST_URL/);
  });

  it("fails fast naming OPENAI_API_KEY when it is missing, before calling the client or streamTurn", async () => {
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
    expect(mockStreamTurn).not.toHaveBeenCalled();
  });
});
