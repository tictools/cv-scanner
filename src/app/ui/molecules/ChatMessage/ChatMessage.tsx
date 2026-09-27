import { isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Container } from "../../atoms/Container/Container";
import { Heading } from "../../atoms/Heading/Heading";
import { Markdown } from "../../atoms/Markdown/Markdown";
import { Text } from "../../atoms/Text/Text";
import { classNames } from "../../classnames/classNames";
import { RetrievalStatus } from "../RetrievalStatus/RetrievalStatus";
import styles from "./ChatMessage.module.css";

export interface ChatMessageProps {
  message: UIMessage;
}

/**
 * One turn's message as a chat bubble — the user's on the trailing side, the
 * assistant's on the leading one — rendered part by part: the assistant's text
 * formatted, the user's as typed, and a retrieval tool call as progress. Cited
 * CVs belong to the source panel, not here.
 *
 * @example
 * ```tsx
 * <ChatMessage message={message} />
 * ```
 */
export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const variant = isUser ? "user" : "assistant";

  return (
    <Container className={classNames(styles.chatMessage, styles[`chatMessage--${variant}`])}>
      <Container className={styles.chatMessage__bubble}>
        <Heading level={4} className={styles.chatMessage__author}>
          {isUser ? "You" : "Assistant"}
        </Heading>
        {message.parts.map((part, index) => {
          if (isTextUIPart(part)) {
            return isUser ? (
              <Text key={`text-${index}`}>{part.text}</Text>
            ) : (
              <Markdown key={`text-${index}`}>{part.text}</Markdown>
            );
          }

          if (isToolUIPart(part)) {
            return <RetrievalStatus key={`tool-${index}`} part={part} />;
          }

          return null;
        })}
      </Container>
    </Container>
  );
};
