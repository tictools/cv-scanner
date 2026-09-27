import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { COMPACTION_THRESHOLD, RETAINED_MESSAGE_COUNT, compact } from "./compaction";

const buildMessage = ({ id, role, text }: { id: string; role: UIMessage["role"]; text: string }): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

const buildMessages = (count: number): UIMessage[] =>
  Array.from({ length: count }, (_, index) =>
    buildMessage({ id: `message-${index}`, role: index % 2 === 0 ? "user" : "assistant", text: `text ${index}` }),
  );

describe("compact", () => {
  it("passes every message through untouched below the threshold", () => {
    const messages = buildMessages(COMPACTION_THRESHOLD);

    expect(compact(messages)).toEqual(messages);
  });

  it("collapses older turns into one summary once the threshold is exceeded, keeping the most recent verbatim", () => {
    const messages = buildMessages(COMPACTION_THRESHOLD + 1);

    const compacted = compact(messages);

    expect(compacted).toHaveLength(1 + RETAINED_MESSAGE_COUNT);
    expect(compacted.slice(1)).toEqual(messages.slice(messages.length - RETAINED_MESSAGE_COUNT));
  });

  it("inserts no summary and changes nothing below the threshold", () => {
    const messages = buildMessages(COMPACTION_THRESHOLD - 1);

    expect(compact(messages)).toEqual(messages);
  });

  it("keeps candidate names and ids from the older turns in the summary", () => {
    const messages = [
      buildMessage({ id: "m0", role: "user", text: "who knows FastAPI?" }),
      buildMessage({
        id: "m1",
        role: "assistant",
        text: "Nikita Crist (nikita-crist) has FastAPI experience.",
      }),
      ...buildMessages(COMPACTION_THRESHOLD - 1),
    ];

    const compacted = compact(messages);
    const summaryText = compacted[0]?.parts.find((part) => part.type === "text");

    expect(summaryText && "text" in summaryText ? summaryText.text : "").toContain("Nikita Crist");
    expect(summaryText && "text" in summaryText ? summaryText.text : "").toContain("nikita-crist");
  });
});
