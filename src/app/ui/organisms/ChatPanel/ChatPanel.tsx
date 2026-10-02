import type { UIMessage } from "ai";
import type { ScannerChatState } from "../../../hooks/useScannerChat";
import { Container } from "../../atoms/Container/Container";
import { RenderOrNull } from "../../atoms/RenderOrNull/RenderOrNull";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { ChatMessage } from "../../molecules/ChatMessage/ChatMessage";
import { ErrorBanner } from "../../molecules/ErrorBanner/ErrorBanner";
import { SearchBar } from "../../molecules/SearchBar/SearchBar";
import styles from "./ChatPanel.module.css";

export interface ChatPanelProps {
  messages: UIMessage[];
  state: ScannerChatState;
  onAsk: (question: string) => void;
}

/**
 * The conversation surface: the message list, a turn-in-progress indicator,
 * a failure banner, and the question input.
 *
 * @example
 * ```tsx
 * <ChatPanel messages={messages} state={state} onAsk={ask} />
 * ```
 */
export const ChatPanel = ({ messages, state, onAsk }: ChatPanelProps) => (
  <Container className={styles["chatPanel"]}>
    <Container className={styles["messageList"]}>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </Container>
    <RenderOrNull shouldRender={state === "streaming"}>
      <Spinner label="answering" />
    </RenderOrNull>
    <RenderOrNull shouldRender={state === "error"}>
      <ErrorBanner message="The assistant cannot be reached." />
    </RenderOrNull>
    <SearchBar onSubmit={onAsk} disabled={state === "streaming"} />
  </Container>
);
