import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ChatProvider, useChatSession } from "./chat-context";

const SESSION_ID_STORAGE_KEY = "cv-scanner:session-id";

const Probe = () => {
  const { sessionId, startNewConversation } = useChatSession();

  return (
    <div>
      <span data-testid="session-id">{sessionId}</span>
      <button onClick={startNewConversation}>New conversation</button>
    </div>
  );
};

describe("ChatProvider / useChatSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("generates and stores a session id on first visit", () => {
    render(
      <ChatProvider>
        <Probe />
      </ChatProvider>,
    );

    const sessionId = screen.getByTestId("session-id").textContent;

    expect(sessionId).toBeTruthy();
    expect(localStorage.getItem(SESSION_ID_STORAGE_KEY)).toBe(sessionId);
  });

  it("reuses the stored session id on a returning visit", () => {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, "existing-session-id");

    render(
      <ChatProvider>
        <Probe />
      </ChatProvider>,
    );

    expect(screen.getByTestId("session-id").textContent).toBe("existing-session-id");
  });

  it("mints and stores a new session id when the user starts a new conversation", async () => {
    const user = userEvent.setup();
    localStorage.setItem(SESSION_ID_STORAGE_KEY, "existing-session-id");

    render(
      <ChatProvider>
        <Probe />
      </ChatProvider>,
    );
    await user.click(screen.getByRole("button", { name: "New conversation" }));

    const newSessionId = screen.getByTestId("session-id").textContent;

    expect(newSessionId).not.toBe("existing-session-id");
    expect(localStorage.getItem(SESSION_ID_STORAGE_KEY)).toBe(newSessionId);
  });
});
