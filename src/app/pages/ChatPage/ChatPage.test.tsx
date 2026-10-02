import type { UIMessage } from "ai";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatProvider } from "../../context/chat-context";

const { useScannerChatMock } = vi.hoisted(() => ({ useScannerChatMock: vi.fn() }));

vi.mock("../../hooks/useScannerChat", () => ({ useScannerChat: useScannerChatMock }));

const { ChatPage } = await import("./ChatPage");

const assistantMessageWithSources: UIMessage = {
  id: "msg-2",
  role: "assistant",
  parts: [
    { type: "text", text: "Jane Doe knows React." },
    {
      type: "tool-scan-cv",
      toolCallId: "call-1",
      state: "output-available",
      input: { query: "react" },
      output: [
        { candidateId: "jane-doe", candidateName: "Jane Doe", source: "data/cvs/jane-doe.pdf", content: "x", score: 0.8 },
      ],
    } as UIMessage["parts"][number],
  ],
};

describe("ChatPage", () => {
  beforeEach(() => {
    localStorage.clear();
    useScannerChatMock.mockReset();
  });

  it("feeds the source panel the most recent answered turn's sources", () => {
    useScannerChatMock.mockReturnValue({ messages: [assistantMessageWithSources], ask: vi.fn(), state: "idle" });

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeTruthy();
  });

  it("starts a new conversation with a fresh session id when the control is activated", async () => {
    const user = userEvent.setup();
    useScannerChatMock.mockReturnValue({ messages: [], ask: vi.fn(), state: "idle" });

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );
    const initialSessionId = useScannerChatMock.mock.calls[0]?.[0]?.sessionId;
    await user.click(screen.getByRole("button", { name: "New conversation" }));
    const latestSessionId = useScannerChatMock.mock.calls.at(-1)?.[0]?.sessionId;

    expect(latestSessionId).not.toBe(initialSessionId);
  });

  it("starting a new conversation carries nothing over: the chat subtree is remounted, not re-rendered", async () => {
    const user = userEvent.setup();
    useScannerChatMock.mockReturnValue({ messages: [], ask: vi.fn(), state: "idle" });

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );
    await user.type(screen.getByPlaceholderText("Ask a question..."), "Who knows React?");
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    expect(screen.getByPlaceholderText<HTMLInputElement>("Ask a question...").value).toBe("");
  });

  it("a full turn: the question appears, then a streamed answer renders and its cited CVs appear in the panel only, the name targeting the PDF", async () => {
    const user = userEvent.setup();
    const ask = vi.fn();
    useScannerChatMock.mockReturnValue({ messages: [], ask, state: "idle" });

    const { rerender } = render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );
    await user.type(screen.getByPlaceholderText("Ask a question..."), "Who knows React?{Enter}");

    expect(ask).toHaveBeenCalledWith("Who knows React?");

    const userMessage: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Who knows React?" }] };
    useScannerChatMock.mockReturnValue({ messages: [userMessage], ask, state: "streaming" });
    rerender(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByText("Who knows React?")).toBeTruthy();
    expect(screen.getByRole("status")).toBeTruthy();

    useScannerChatMock.mockReturnValue({ messages: [userMessage, assistantMessageWithSources], ask, state: "idle" });
    rerender(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByText("Jane Doe knows React.")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Jane Doe" }).length).toBe(1);
    expect(screen.getByRole("link", { name: "Jane Doe" }).getAttribute("href")).toBe("/cvs/jane-doe.pdf");
  });

  it("keeps the previous turn's sources visible while the next turn streams, even after its retrieval resolves, and switches once streaming ends", () => {
    const ask = vi.fn();
    const firstUserMessage: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Who knows React?" }] };
    useScannerChatMock.mockReturnValue({
      messages: [firstUserMessage, assistantMessageWithSources],
      ask,
      state: "idle",
    });

    const { rerender } = render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeTruthy();

    const secondUserMessage: UIMessage = { id: "u2", role: "user", parts: [{ type: "text", text: "Who knows Go?" }] };
    const secondAssistantMessageWithSources: UIMessage = {
      id: "msg-4",
      role: "assistant",
      parts: [
        {
          type: "tool-scan-cv",
          toolCallId: "call-2",
          state: "output-available",
          input: { query: "go" },
          output: [
            {
              candidateId: "john-smith",
              candidateName: "John Smith",
              source: "data/cvs/john-smith.pdf",
              content: "y",
              score: 0.7,
            },
          ],
        } as UIMessage["parts"][number],
      ],
    };
    useScannerChatMock.mockReturnValue({
      messages: [firstUserMessage, assistantMessageWithSources, secondUserMessage, secondAssistantMessageWithSources],
      ask,
      state: "streaming",
    });
    rerender(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "John Smith" })).toBeNull();

    useScannerChatMock.mockReturnValue({
      messages: [firstUserMessage, assistantMessageWithSources, secondUserMessage, secondAssistantMessageWithSources],
      ask,
      state: "idle",
    });
    rerender(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByRole("link", { name: "John Smith" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Jane Doe" })).toBeNull();
  });

  it("reload: mounting with a replayed history re-derives the latest answer's cited CVs", () => {
    const userMessage: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "Who knows React?" }] };
    useScannerChatMock.mockReturnValue({
      messages: [userMessage, assistantMessageWithSources],
      ask: vi.fn(),
      state: "idle",
    });

    render(
      <ChatProvider>
        <ChatPage />
      </ChatProvider>,
    );

    expect(screen.getByText("Jane Doe knows React.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Jane Doe" }).getAttribute("href")).toBe("/cvs/jane-doe.pdf");
  });
});
