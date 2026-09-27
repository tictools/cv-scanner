import type { UIMessage } from "ai";

export const COMPACTION_THRESHOLD = 10;
export const RETAINED_MESSAGE_COUNT = 5;

const SUMMARY_MESSAGE_ID = "compaction-summary";

const textOf = (message: UIMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");

const buildSummaryMessage = (olderMessages: UIMessage[]): UIMessage => ({
  id: SUMMARY_MESSAGE_ID,
  role: "system",
  parts: [
    {
      type: "text",
      text: [
        "Summary of the earlier part of this conversation:",
        ...olderMessages.map((message) => `${message.role}: ${textOf(message)}`),
      ].join("\n"),
    },
  ],
});

export const compact = (messages: UIMessage[]): UIMessage[] => {
  if (messages.length <= COMPACTION_THRESHOLD) {
    return messages;
  }

  const olderMessages = messages.slice(0, messages.length - RETAINED_MESSAGE_COUNT);
  const recentMessages = messages.slice(messages.length - RETAINED_MESSAGE_COUNT);

  return [buildSummaryMessage(olderMessages), ...recentMessages];
};
