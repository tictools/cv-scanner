import type { Maybe, Nullable } from "@shared/ts/typeUtils/aliases";
import { isTextUIPart, type UIMessage } from "ai";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

const AT_BOTTOM_THRESHOLD_PX = 4;

export interface UseChatScrollOptions {
  messages: UIMessage[];
}

export interface UseChatScrollResult {
  listRef: RefObject<Nullable<HTMLDivElement>>;
  onScroll: () => void;
  hasNewMessage: boolean;
  scrollToLatest: () => void;
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const messageSignature = (message: Maybe<UIMessage>): string => {
  if (!message) {
    return "empty";
  }

  const textLength = message.parts.reduce(
    (total, part) => (isTextUIPart(part) ? total + part.text.length : total),
    0,
  );

  return `${message.id}:${message.role}:${message.parts.length}:${textLength}`;
};

/**
 * Follows new content while the user is at the bottom of the message list,
 * and otherwise flags arriving assistant content with `hasNewMessage` instead
 * of moving the scroll position. Colocated with `ChatPanel`, the only caller.
 *
 * @example
 * ```tsx
 * const { listRef, onScroll, hasNewMessage, scrollToLatest } = useChatScroll({ messages });
 * ```
 */
export const useChatScroll = ({
  messages,
}: UseChatScrollOptions): UseChatScrollResult => {
  const listRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const lastMessage = messages.at(-1);

  const scrollToBottom = (behavior: ScrollBehavior) => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTo({ top: list.scrollHeight, behavior });
    isAtBottomRef.current = true;
  };

  const onScroll = () => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    const atBottom =
      list.scrollHeight - list.scrollTop - list.clientHeight <=
      AT_BOTTOM_THRESHOLD_PX;
    isAtBottomRef.current = atBottom;

    if (atBottom) {
      setHasNewMessage(false);
    }
  };

  useLayoutEffect(() => {
    if (!lastMessage) {
      return;
    }

    if (lastMessage.role === "user" || isAtBottomRef.current) {
      scrollToBottom("auto");
      setHasNewMessage(false);
      return;
    }

    if (lastMessage.role === "assistant") {
      setHasNewMessage(true);
    }
  }, [messageSignature(lastMessage)]);

  const scrollToLatest = () => {
    scrollToBottom(prefersReducedMotion() ? "auto" : "smooth");
  };

  return { listRef, onScroll, hasNewMessage, scrollToLatest };
};
