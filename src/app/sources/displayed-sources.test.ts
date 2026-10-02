import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import type { ScannerChatState } from "../hooks/useScannerChat";
import { displayedSources } from "./displayed-sources";
import { latestAnsweredSources } from "./latest-answered-sources";

const userMessage = ({ id }: { id: string }): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: "question" }],
});

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

describe("displayedSources", () => {
  it("ignores the in-flight turn's resolved sources while streaming and keeps the previous answered turn's", () => {
    const messages = [
      scanCVMessage({ id: "a", score: 0.5 }),
      userMessage({ id: "u1" }),
      scanCVMessage({ id: "b", score: 0.9 }),
    ];

    expect(
      displayedSources({ messages, state: "streaming" })?.map((source) => source.candidateId),
    ).toEqual(["a"]);
  });

  it("returns undefined while streaming when there is no previous answered turn", () => {
    const messages = [userMessage({ id: "u1" }), scanCVMessage({ id: "a", score: 0.5 })];

    expect(displayedSources({ messages, state: "streaming" })).toBeUndefined();
  });

  it.each(["idle", "error"] satisfies ScannerChatState[])(
    "returns latestAnsweredSources(messages) unchanged when state is %s",
    (state) => {
      const messages = [scanCVMessage({ id: "a", score: 0.5 }), userMessage({ id: "u2" }), textMessage({ id: "b" })];

      expect(displayedSources({ messages, state })).toEqual(latestAnsweredSources(messages));
    },
  );
});
