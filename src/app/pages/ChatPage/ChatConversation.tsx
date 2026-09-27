import { useScannerChat } from "../../hooks/useScannerChat";
import { latestAnsweredSources } from "../../sources/latest-answered-sources";
import { ChatPanel } from "../../ui/organisms/ChatPanel/ChatPanel";
import { SourcePanel } from "../../ui/organisms/SourcePanel/SourcePanel";

export interface ChatConversationProps {
  sessionId: string;
}

/**
 * One session's conversation and its cited CVs. Everything tied to a single
 * session lives here so that mounting it under `key={sessionId}` is all it takes
 * to start a new one — see `ChatPage`.
 *
 * Returns both panels as siblings, with no wrapper, so they stay direct children
 * of `ChatPage`'s grid and share its row.
 *
 * @example
 * ```tsx
 * <ChatConversation key={sessionId} sessionId={sessionId} />
 * ```
 */
export const ChatConversation = ({ sessionId }: ChatConversationProps) => {
  const { messages, ask, state } = useScannerChat({ sessionId });

  return (
    <>
      <ChatPanel messages={messages} state={state} onAsk={ask} />
      <SourcePanel sources={latestAnsweredSources(messages)} />
    </>
  );
};
