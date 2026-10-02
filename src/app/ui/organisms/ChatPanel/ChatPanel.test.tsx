import type { UIMessage } from "ai";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";

const LIST_HEIGHT = 500;
const LIST_SCROLL_HEIGHT = 1000;
const AT_BOTTOM_SCROLL_TOP = 500;
const NOT_AT_BOTTOM_SCROLL_TOP = 0;

const setListGeometry = (list: HTMLElement, { scrollTop }: { scrollTop: number }) => {
  Object.defineProperty(list, "scrollHeight", { value: LIST_SCROLL_HEIGHT, configurable: true });
  Object.defineProperty(list, "clientHeight", { value: LIST_HEIGHT, configurable: true });
  Object.defineProperty(list, "scrollTop", { value: scrollTop, configurable: true, writable: true });
};

const getMessageList = (container: HTMLElement): HTMLElement =>
  container.querySelector('[class*="messageList"]') as HTMLElement;

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
  beforeEach(() => {
    vi.spyOn(Element.prototype, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("shows no indicator while the user is at the bottom when an answer arrives", () => {
    const { rerender } = render(<ChatPanel messages={[userMessage]} state="idle" onAsk={vi.fn()} />);

    rerender(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "New message" })).toBeNull();
  });

  it("shows the indicator when an assistant message arrives while scrolled up", () => {
    const { container, rerender } = render(<ChatPanel messages={[userMessage]} state="idle" onAsk={vi.fn()} />);
    const list = getMessageList(container);
    setListGeometry(list, { scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    fireEvent.scroll(list);

    rerender(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    expect(screen.getByRole("button", { name: "New message" })).toBeTruthy();
  });

  it("clicking the indicator scrolls to the bottom, and it clears only once the bottom is reached", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<ChatPanel messages={[userMessage]} state="idle" onAsk={vi.fn()} />);
    const list = getMessageList(container);
    setListGeometry(list, { scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    fireEvent.scroll(list);
    rerender(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "New message" }));

    expect(list.scrollTo).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "New message" })).toBeTruthy();

    setListGeometry(list, { scrollTop: AT_BOTTOM_SCROLL_TOP });
    fireEvent.scroll(list);

    expect(screen.queryByRole("button", { name: "New message" })).toBeNull();
  });

  it("keeps the indicator visible after a scroll that doesn't reach the bottom", () => {
    const { container, rerender } = render(<ChatPanel messages={[userMessage]} state="idle" onAsk={vi.fn()} />);
    const list = getMessageList(container);
    setListGeometry(list, { scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    fireEvent.scroll(list);
    rerender(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    setListGeometry(list, { scrollTop: NOT_AT_BOTTOM_SCROLL_TOP + 1 });
    fireEvent.scroll(list);

    expect(screen.getByRole("button", { name: "New message" })).toBeTruthy();
  });

  it("shows no indicator when history is replayed into an empty conversation", () => {
    render(<ChatPanel messages={[userMessage, assistantMessageWithSources]} state="idle" onAsk={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "New message" })).toBeNull();
  });
});
