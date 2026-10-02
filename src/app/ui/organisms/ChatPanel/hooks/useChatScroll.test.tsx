import type { UIMessage } from "ai";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChatScroll } from "./useChatScroll";

const NOT_AT_BOTTOM_SCROLL_TOP = 0;
const AT_BOTTOM_SCROLL_TOP = 500;
const LIST_HEIGHT = 500;
const LIST_SCROLL_HEIGHT = 1000;

const userMessage: UIMessage = {
  id: "msg-1",
  role: "user",
  parts: [{ type: "text", text: "Who knows React?" }],
};

const assistantMessage: UIMessage = {
  id: "msg-2",
  role: "assistant",
  parts: [{ type: "text", text: "Jane Doe knows React." }],
};

const streamedAssistantMessage: UIMessage = {
  ...assistantMessage,
  parts: [{ type: "text", text: "Jane Doe knows React and TypeScript." }],
};

const mockMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches, media: "", addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  );
};

const createListElement = ({ scrollTop }: { scrollTop: number }): HTMLDivElement => {
  const element = document.createElement("div");

  Object.defineProperty(element, "scrollHeight", { value: LIST_SCROLL_HEIGHT, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: LIST_HEIGHT, configurable: true });
  Object.defineProperty(element, "scrollTop", { value: scrollTop, configurable: true, writable: true });
  element.scrollTo = vi.fn();

  return element;
};

describe("useChatScroll", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scrolls to the bottom and raises nothing when assistant content arrives at the bottom", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [] as UIMessage[] },
    });
    const list = createListElement({ scrollTop: AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;

    rerender({ messages: [assistantMessage] });

    expect(list.scrollTo).toHaveBeenCalled();
    expect(result.current.hasNewMessage).toBe(false);
  });

  it("raises hasNewMessage and does not scroll when assistant content arrives while scrolled up", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [userMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());

    rerender({ messages: [userMessage, assistantMessage] });

    expect(list.scrollTo).not.toHaveBeenCalled();
    expect(result.current.hasNewMessage).toBe(true);
  });

  it("always scrolls to the bottom for a new user message, even while scrolled up", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [assistantMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());

    rerender({ messages: [assistantMessage, userMessage] });

    expect(list.scrollTo).toHaveBeenCalled();
  });

  it("keeps hasNewMessage when a scroll doesn't reach the bottom", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [userMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());
    rerender({ messages: [userMessage, assistantMessage] });

    Object.defineProperty(list, "scrollTop", { value: NOT_AT_BOTTOM_SCROLL_TOP + 1, configurable: true });
    act(() => result.current.onScroll());

    expect(result.current.hasNewMessage).toBe(true);
  });

  it("clears hasNewMessage when a scroll reaches the bottom", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [userMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());
    rerender({ messages: [userMessage, assistantMessage] });

    Object.defineProperty(list, "scrollTop", { value: AT_BOTTOM_SCROLL_TOP, configurable: true });
    act(() => result.current.onScroll());

    expect(result.current.hasNewMessage).toBe(false);
  });

  it("re-raises hasNewMessage on further streamed growth while still scrolled up", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [userMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());
    rerender({ messages: [userMessage, assistantMessage] });

    rerender({ messages: [userMessage, streamedAssistantMessage] });

    expect(result.current.hasNewMessage).toBe(true);
  });

  it("does not clear hasNewMessage on activation alone — only arrival, via onScroll, does", () => {
    mockMatchMedia(false);

    const { result, rerender } = renderHook(({ messages }) => useChatScroll({ messages }), {
      initialProps: { messages: [userMessage] },
    });
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;
    act(() => result.current.onScroll());
    rerender({ messages: [userMessage, assistantMessage] });

    act(() => result.current.scrollToLatest());

    expect(result.current.hasNewMessage).toBe(true);
  });

  it("calls scrollTo with smooth behaviour by default when activated", () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useChatScroll({ messages: [assistantMessage] }));
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;

    act(() => result.current.scrollToLatest());

    expect(list.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
  });

  it("calls scrollTo with 'auto' behaviour when activated under reduced motion", () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useChatScroll({ messages: [assistantMessage] }));
    const list = createListElement({ scrollTop: NOT_AT_BOTTOM_SCROLL_TOP });
    result.current.listRef.current = list;

    act(() => result.current.scrollToLatest());

    expect(list.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
  });
});
