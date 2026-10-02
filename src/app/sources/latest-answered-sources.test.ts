import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { latestAnsweredSources } from "./latest-answered-sources";

const textMessage = ({ id }: { id: string }): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "text", text: "hi" }],
});

const scanCVMessage = ({ id, score }: { id: string; score: number }): UIMessage => ({
  id,
  role: "assistant",
  parts: [
    {
      type: "tool-scan-cv",
      toolCallId: `call-${id}`,
      state: "output-available",
      input: { query: "react" },
      output: [{ candidateId: id, candidateName: id, source: `${id}.pdf`, content: id, score }],
    } as UIMessage["parts"][number],
  ],
});

describe("latestAnsweredSources", () => {
  it("returns the last assistant message's sources when it has any", () => {
    const messages = [scanCVMessage({ id: "a", score: 0.5 }), scanCVMessage({ id: "b", score: 0.9 })];

    expect(latestAnsweredSources(messages)?.map((source) => source.candidateId)).toEqual(["b"]);
  });

  it("skips a trailing message with no sources and returns the previous answered turn's", () => {
    const messages = [scanCVMessage({ id: "a", score: 0.5 }), textMessage({ id: "b" })];

    expect(latestAnsweredSources(messages)?.map((source) => source.candidateId)).toEqual(["a"]);
  });

  it("returns undefined when no message has any sources", () => {
    const messages = [textMessage({ id: "a" }), textMessage({ id: "b" })];

    expect(latestAnsweredSources(messages)).toBeUndefined();
  });

  it("returns undefined for an empty conversation", () => {
    expect(latestAnsweredSources([])).toBeUndefined();
  });
});
