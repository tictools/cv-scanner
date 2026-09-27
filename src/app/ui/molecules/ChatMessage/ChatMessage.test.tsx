import type { UIMessage } from "ai";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "./ChatMessage";
import styles from "./ChatMessage.module.css";

const assistantMessageWithSources: UIMessage = {
  id: "msg-4",
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

describe("ChatMessage", () => {
  it("renders a user message's text as typed, in a bubble aligned to the user's side", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "Who knows **React**?" }],
    };

    const { container } = render(<ChatMessage message={message} />);

    expect(screen.getByText("Who knows **React**?")).toBeTruthy();
    expect(screen.getByText("You")).toBeTruthy();
    expect(container.querySelector(`.${styles["chatMessage--user"]}`)).toBeTruthy();
  });

  it("renders an assistant message in a bubble aligned to the assistant's side", () => {
    const message: UIMessage = {
      id: "msg-2",
      role: "assistant",
      parts: [{ type: "text", text: "Jane Doe knows React." }],
    };

    const { container } = render(<ChatMessage message={message} />);

    expect(screen.getByText("Jane Doe knows React.")).toBeTruthy();
    expect(screen.getByText("Assistant")).toBeTruthy();
    expect(container.querySelector(`.${styles["chatMessage--assistant"]}`)).toBeTruthy();
  });

  it("formats an assistant answer's markup: a list of candidates, each name emphasised", () => {
    const message: UIMessage = {
      id: "msg-3",
      role: "assistant",
      parts: [{ type: "text", text: "- **Stefan Conroy** — *Senior Full-stack Developer*\n- **Jane Doe** — *QA Engineer*" }],
    };

    const { container } = render(<ChatMessage message={message} />);

    expect(container.querySelectorAll("ul li").length).toBe(2);
    expect(container.querySelector("strong")?.textContent).toBe("Stefan Conroy");
    expect(container.textContent).not.toContain("**");
  });

  it("shows retrieval progress for a pending tool-scan-cv part", () => {
    const message: UIMessage = {
      id: "msg-5",
      role: "assistant",
      parts: [
        {
          type: "tool-scan-cv",
          toolCallId: "call-1",
          state: "input-available",
          input: { query: "react" },
        } as UIMessage["parts"][number],
      ],
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("searching the CVs")).toBeTruthy();
  });

  it("renders no source entries for a message that cites CVs — the panel owns them", () => {
    render(<ChatMessage message={assistantMessageWithSources} />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});
