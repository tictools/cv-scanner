import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { sourcesFromMessage } from "./message-sources";

const scanCVPart = ({ output }: { output: unknown }) =>
  ({
    type: "tool-scan-cv",
    toolCallId: "call-1",
    state: "output-available",
    input: { query: "react" },
    output,
  }) as UIMessage["parts"][number];

describe("sourcesFromMessage", () => {
  it("derives SourceReference[] from the message's scan-cv tool parts, ordered by score", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [
        scanCVPart({
          output: [
            { candidateId: "a", candidateName: "A", source: "a.pdf", content: "a", score: 0.2 },
            { candidateId: "b", candidateName: "B", source: "b.pdf", content: "b", score: 0.9 },
          ],
        }),
      ],
    };

    expect(sourcesFromMessage(message).map((source) => source.candidateId)).toEqual(["b", "a"]);
  });

  it("de-duplicates the same candidate across two tool parts, keeping the higher score", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [
        scanCVPart({
          output: [{ candidateId: "a", candidateName: "A", source: "a.pdf", content: "a", score: 0.4 }],
        }),
        scanCVPart({
          output: [{ candidateId: "a", candidateName: "A", source: "a.pdf", content: "a", score: 0.9 }],
        }),
      ],
    };

    expect(sourcesFromMessage(message)).toEqual([
      { candidateId: "a", candidateName: "A", source: "a.pdf", score: 0.9 },
    ]);
  });

  it("returns zero sources for a message with no tool part", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text", text: "Hello" }],
    };

    expect(sourcesFromMessage(message)).toEqual([]);
  });

  it("returns zero sources when the tool part's output is an error object", () => {
    const message: UIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [scanCVPart({ output: { error: "vector store unreachable" } })],
    };

    expect(sourcesFromMessage(message)).toEqual([]);
  });
});
