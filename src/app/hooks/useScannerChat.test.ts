import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAgentMock, useAgentChatMock } = vi.hoisted(() => ({
  useAgentMock: vi.fn(),
  useAgentChatMock: vi.fn(),
}));

vi.mock("agents/react", () => ({ useAgent: useAgentMock }));
vi.mock("@cloudflare/ai-chat/react", () => ({ useAgentChat: useAgentChatMock }));

const { useScannerChat } = await import("./useScannerChat");

const AGENT_STUB = { agent: "scanner-agent", name: "session-1", connectionError: null };

const chatStub = (overrides: Partial<ReturnType<typeof useAgentChatMock>> = {}) => ({
  messages: [],
  sendMessage: vi.fn(),
  isStreaming: false,
  connectionError: null,
  error: undefined,
  ...overrides,
});

describe("useScannerChat", () => {
  beforeEach(() => {
    useAgentMock.mockReset();
    useAgentChatMock.mockReset();
    useAgentMock.mockReturnValue(AGENT_STUB);
    useAgentChatMock.mockReturnValue(chatStub());
  });

  it("connects to the scanner-agent Durable Object named by the session id", () => {
    renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(useAgentMock).toHaveBeenCalledWith(expect.objectContaining({ agent: "scanner-agent", name: "session-1" }));
  });

  it("exposes the SDK's messages and an ask function that sends the question", () => {
    const sendMessage = vi.fn();
    useAgentChatMock.mockReturnValue(chatStub({ messages: [{ id: "1" }], sendMessage }));

    const { result } = renderHook(() => useScannerChat({ sessionId: "session-1" }));
    result.current.ask("Who knows React?");

    expect(result.current.messages).toEqual([{ id: "1" }]);
    expect(sendMessage).toHaveBeenCalledWith({ text: "Who knows React?" });
  });

  it("derives streaming state while the SDK reports a stream", () => {
    useAgentChatMock.mockReturnValue(chatStub({ isStreaming: true }));

    const { result } = renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(result.current.state).toBe("streaming");
  });

  it("derives error state on a connection failure", () => {
    const connectionError = new Error("connection lost");
    useAgentChatMock.mockReturnValue(chatStub({ connectionError }));

    const { result } = renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(result.current.state).toBe("error");
  });

  it("derives error state on a turn failure", () => {
    useAgentChatMock.mockReturnValue(chatStub({ error: new Error("turn failed") }));

    const { result } = renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(result.current.state).toBe("error");
  });

  it("derives idle state otherwise", () => {
    const { result } = renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(result.current.state).toBe("idle");
  });

  it("keeps no transcript of its own in browser storage", () => {
    useAgentChatMock.mockReturnValue(chatStub({ messages: [{ id: "1" }] }));

    renderHook(() => useScannerChat({ sessionId: "session-1" }));

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
