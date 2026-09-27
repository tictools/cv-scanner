import { useChatSession } from "../../context/chat-context";
import { Button } from "../../ui/atoms/Button/Button";
import { Container } from "../../ui/atoms/Container/Container";
import { ChatConversation } from "./ChatConversation";
import styles from "./ChatPage.module.css";

/**
 * The screen: the conversation, its cited CVs, and starting a new one.
 *
 * The conversation is mounted under `key={sessionId}`, so a new session replaces
 * it outright instead of re-rendering it with a different id — the agents SDK
 * reports its connection one render behind a `name` change, and anything it
 * still holds would otherwise be shown against the new session.
 *
 * @example
 * ```tsx
 * <ChatProvider>
 *   <ChatPage />
 * </ChatProvider>
 * ```
 */
export const ChatPage = () => {
  const { sessionId, startNewConversation } = useChatSession();

  return (
    <Container className={styles.chatPage}>
      <Container className={styles.header}>
        <Button variant="secondary" onClick={startNewConversation}>
          New conversation
        </Button>
      </Container>
      <ChatConversation key={sessionId} sessionId={sessionId} />
    </Container>
  );
};
