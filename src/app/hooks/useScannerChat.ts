import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { UIMessage } from "ai";

export type ScannerChatState = "idle" | "streaming" | "error";

export interface UseScannerChatOptions {
  sessionId: string;
}

export interface UseScannerChatResult {
  messages: UIMessage[];
  ask: (question: string) => void;
  state: ScannerChatState;
}

const deriveState = ({ isStreaming, failed }: { isStreaming: boolean; failed: boolean }): ScannerChatState => {
  if (isStreaming) {
    return "streaming";
  }

  return failed ? "error" : "idle";
};

/**
 * Narrows `useAgent` + `useAgentChat` (the agents SDK's own transport and
 * history) to what the chat organisms need. Holds no state of its own.
 *
 * @example
 * ```tsx
 * const { messages, ask, state } = useScannerChat({ sessionId });
 * ```
 */
export const useScannerChat = ({ sessionId }: UseScannerChatOptions): UseScannerChatResult => {
  const agent = useAgent({ agent: "scanner-agent", name: sessionId });
  const { messages, sendMessage, isStreaming, connectionError, error } = useAgentChat({ agent });

  const ask = (question: string) => {
    void sendMessage({ text: question });
  };

  return {
    messages,
    ask,
    state: deriveState({ isStreaming, failed: Boolean(connectionError ?? error) }),
  };
};
