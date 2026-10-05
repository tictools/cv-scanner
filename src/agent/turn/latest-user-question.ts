import type { UIMessage } from "ai";

export const latestUserQuestion = (messages: UIMessage[]): string => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return (lastUserMessage?.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
};
