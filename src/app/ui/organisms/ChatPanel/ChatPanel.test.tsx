import type { UIMessage } from "ai";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

const userMessage: UIMessage = {
  id: "msg-1",
  role: "user",
  parts: [{ type: "text", text: "Who knows React?" }],
};

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

describe("ChatPanel", () => {
  it("renders the given messages", () => {
    render(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    expect(screen.getByText("Who knows React?")).toBeTruthy();
    expect(screen.getByText("Jane Doe knows React.")).toBeTruthy();
  });

  it("shows a spinner while a turn is in progress", () => {
    render(<ChatPanel messages={[userMessage]} state="streaming" onAsk={vi.fn()} />);

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows an error banner on failure", () => {
    render(<ChatPanel messages={[userMessage]} state="error" onAsk={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("hands a submitted question to onAsk", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();

    render(<ChatPanel messages={[]} state="idle" onAsk={onAsk} />);
    await user.type(screen.getByPlaceholderText("Ask a question..."), "Who knows React?{Enter}");

    expect(onAsk).toHaveBeenCalledWith("Who knows React?");
  });
});
