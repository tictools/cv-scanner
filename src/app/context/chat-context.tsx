import { createContext, useContext, useState, type ReactNode } from "react";

const SESSION_ID_STORAGE_KEY = "cv-scanner:session-id";

const mintSessionId = (): string => {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_ID_STORAGE_KEY, id);

  return id;
};

const readOrMintSessionId = (): string => localStorage.getItem(SESSION_ID_STORAGE_KEY) ?? mintSessionId();

interface ChatContextValue {
  sessionId: string;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Provides the chat session identity: a `localStorage`-persisted id, reused
 * across reloads, replaced with a fresh one on `startNewConversation()`.
 *
 * @example
 * ```tsx
 * <ChatProvider>
 *   <ChatPage />
 * </ChatProvider>
 * ```
 */
export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [sessionId, setSessionId] = useState(readOrMintSessionId);

  const startNewConversation = () => {
    setSessionId(mintSessionId());
  };

  return <ChatContext.Provider value={{ sessionId, startNewConversation }}>{children}</ChatContext.Provider>;
};

export const useChatSession = (): ChatContextValue => {
  const value = useContext(ChatContext);

  if (!value) {
    throw new Error("useChatSession must be used within a ChatProvider");
  }

  return value;
};
