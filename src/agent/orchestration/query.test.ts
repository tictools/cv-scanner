import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { SYSTEM_PROMPT } from "./system-prompt";

const { mockRetrieve } = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
}));

vi.mock("@rag/retrieval/retrieve", () => ({
  retrieve: mockRetrieve,
}));

const { runAgent, streamAgent, DEFAULT_MAX_STEPS } = await import("./query");

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

describe("runAgent", () => {
  it("returns { text, sources, toolCalls, retrievedChunks } for the tool-calling path", async () => {
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

    expect(result.text).toBe("Nikita Crist has FastAPI experience.");
    expect(result.sources).toEqual([
      {
        candidateId: "nikita-crist",
        candidateName: "Nikita Crist",
        source: "data/cvs/nikita-crist.pdf",
        score: 0.9,
      },
    ]);
    expect(result.toolCalls).toEqual([
      { toolName: "scan-cv", input: { query: "FastAPI" } },
    ]);
    expect(result.retrievedChunks).toEqual([
      {
        candidateId: "nikita-crist",
        candidateName: "Nikita Crist",
        source: "data/cvs/nikita-crist.pdf",
        content: "Nikita Crist has FastAPI experience.",
        score: 0.9,
      },
    ]);
  });

  it("returns an answer with zero sources on the no-tool-call path, and it is not an error", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [textStep("Hello! Ask me about the candidates.")],
    });

    const result = await runAgent({ model, messages: buildMessages("hello") });

    expect(result.text).toBe("Hello! Ask me about the candidates.");
    expect(result.sources).toEqual([]);
    expect(result.toolCalls).toEqual([]);
  });

  it("stops a model that keeps requesting tool calls at the step limit", async () => {
    mockRetrieve.mockResolvedValue([]);
    let calls = 0;
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        calls += 1;
        return toolCallStep({ toolCallId: `call-${calls}`, query: "anything" });
      },
    });
    const maxSteps = 2;

    await runAgent({ model, messages: buildMessages("who knows everything?"), maxSteps });

    expect(calls).toBe(maxSteps);
  });

  it("applies DEFAULT_MAX_STEPS when maxSteps is omitted", () => {
    expect(DEFAULT_MAX_STEPS).toBeGreaterThan(0);
  });
});

describe("streamAgent and runAgent share configuration", () => {
  it("send the same system prompt and tool set to the model", async () => {
    mockRetrieve.mockResolvedValue([]);
    const generateModel = new MockLanguageModelV4({ doGenerate: [textStep("hi")] });
    const streamModel = new MockLanguageModelV4({
      doStream: {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "1" });
            controller.enqueue({ type: "text-delta", id: "1", delta: "hi" });
            controller.enqueue({ type: "text-end", id: "1" });
            controller.enqueue({
              type: "finish",
              finishReason: { unified: "stop", raw: "stop" },
              usage: NULL_USAGE,
            });
            controller.close();
          },
        }),
      },
    });

    await runAgent({ model: generateModel, messages: buildMessages("hello") });
    const streamResult = await streamAgent({ model: streamModel, messages: buildMessages("hello") });
    await streamResult.text;

    const generateCall = generateModel.doGenerateCalls[0];
    const streamCall = streamModel.doStreamCalls[0];
    const systemMessageOf = (call: typeof generateCall) =>
      call?.prompt.find((message) => message.role === "system");
    const toolNamesOf = (call: typeof generateCall) => call?.tools?.map((tool) => tool.name).sort();

    expect(systemMessageOf(generateCall)).toEqual(systemMessageOf(streamCall));
    expect(systemMessageOf(generateCall)?.content).toBe(SYSTEM_PROMPT);
    expect(toolNamesOf(generateCall)).toEqual(toolNamesOf(streamCall));
    expect(toolNamesOf(generateCall)).toEqual(["scan-cv"]);
  });
});
