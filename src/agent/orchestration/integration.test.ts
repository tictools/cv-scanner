import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";

const { mockRetrieve } = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
}));

vi.mock("@rag/retrieval/retrieve", () => ({
  retrieve: mockRetrieve,
}));

const { runAgent } = await import("./query");
const { SYSTEM_PROMPT } = await import("./system-prompt");

const NULL_USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

const textStep = (text: string) => ({
  content: [{ type: "text" as const, text }],
  finishReason: { unified: "stop" as const, raw: "stop" },
  usage: NULL_USAGE,
  warnings: [],
});

const toolCallStep = ({ toolCallId, query }: { toolCallId: string; query: string }) => ({
  content: [
    {
      type: "tool-call" as const,
      toolCallId,
      toolName: "scan-cv",
      input: JSON.stringify({ query }),
    },
  ],
  finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
  usage: NULL_USAGE,
  warnings: [],
});

const buildMessages = (text: string) => [
  { id: "m1", role: "user" as const, parts: [{ type: "text" as const, text }] },
];

describe("agent integration: question -> tool -> grounded answer + sources", () => {
  it("calls scan-cv, grounds the answer, and derives the expected SourceReference[] — no credentials, no network, no Worker", async () => {
    mockRetrieve.mockResolvedValue([
      {
        candidateId: "nikita-crist",
        candidateName: "Nikita Crist",
        source: "data/cvs/nikita-crist.pdf",
        content: "Nikita Crist has FastAPI experience.",
        score: 0.9,
      },
    ]);
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCallStep({ toolCallId: "call-1", query: "FastAPI" }),
        textStep("Nikita Crist has FastAPI experience."),
      ],
    });

    const result = await runAgent({ model, messages: buildMessages("who knows FastAPI?") });

    expect(mockRetrieve).toHaveBeenCalledWith("FastAPI", { topK: 5, credentials: undefined });
    expect(result.text).toBe("Nikita Crist has FastAPI experience.");
    expect(result.sources).toEqual([
      {
        candidateId: "nikita-crist",
        candidateName: "Nikita Crist",
        source: "data/cvs/nikita-crist.pdf",
        score: 0.9,
      },
    ]);
  });

  it("admits the corpus has no match and carries zero sources when retrieval returns nothing", async () => {
    mockRetrieve.mockResolvedValue([]);
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCallStep({ toolCallId: "call-1", query: "COBOL" }),
        textStep("No candidate in the collection has COBOL experience."),
      ],
    });

    const result = await runAgent({ model, messages: buildMessages("who knows COBOL?") });

    expect(result.text).toBe("No candidate in the collection has COBOL experience.");
    expect(result.sources).toEqual([]);
  });

  it("reaches the model with the scope instruction in the system prompt, and a turn with no tool call carries zero sources", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [textStep("Sorry, that's outside what I cover — ask me about the CV collection.")],
    });

    const result = await runAgent({ model, messages: buildMessages("what's the weather today?") });

    expect(model.doGenerateCalls[0]?.prompt.find((message) => message.role === "system")?.content).toBe(
      SYSTEM_PROMPT,
    );
    expect(SYSTEM_PROMPT).toMatch(/scope/i);
    expect(mockRetrieve).not.toHaveBeenCalled();
    expect(result.sources).toEqual([]);
  });

  it("answers the in-scope half of a mixed request with sources, without a blanket early return", async () => {
    mockRetrieve.mockResolvedValue([
      {
        candidateId: "jeremiah-huel",
        candidateName: "Jeremiah Huel",
        source: "data/cvs/jeremiah-huel.pdf",
        content: "Proficient in Python.",
        score: 0.7,
      },
    ]);
    const model = new MockLanguageModelV4({
      doGenerate: [
        toolCallStep({ toolCallId: "call-1", query: "Python" }),
        textStep(
          "Jeremiah Huel knows Python. I can't determine a salary to offer, since that isn't in the CVs.",
        ),
      ],
    });

    const result = await runAgent({
      model,
      messages: buildMessages("which candidates know Python, and what salary should I offer?"),
    });

    expect(mockRetrieve).toHaveBeenCalled();
    expect(result.sources).toEqual([
      {
        candidateId: "jeremiah-huel",
        candidateName: "Jeremiah Huel",
        source: "data/cvs/jeremiah-huel.pdf",
        score: 0.7,
      },
    ]);
  });
});
