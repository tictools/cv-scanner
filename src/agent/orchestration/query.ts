import { type LanguageModel, type UIMessage, convertToModelMessages, generateText, stepCountIs, streamText } from "ai";
import { extractSources, type ToolResultInput } from "../extraction/extract-sources";
import { type CreateToolsOptions, createTools } from "../tools";
import { compact } from "./compaction";
// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
import { logGroundednessAudit } from "./groundedness-audit-log";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { AgentResult, AgentToolCall, RetrievedChunk } from "./types";

export const DEFAULT_MAX_STEPS = 4;

export interface AgentQueryOptions {
  model: LanguageModel;
  messages: UIMessage[];
  maxSteps?: number;
  credentials?: CreateToolsOptions["credentials"];
}

const SCAN_CV_TOOL_NAME = "scan-cv";

const extractRetrievedChunks = (toolResults: ToolResultInput[]): RetrievedChunk[] =>
  toolResults
    .filter((result) => result.toolName === SCAN_CV_TOOL_NAME)
    .flatMap((result) => (Array.isArray(result.output) ? (result.output as RetrievedChunk[]) : []));

const latestUserQuestion = (messages: UIMessage[]): string => {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return (lastUserMessage?.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
};

const sharedCallConfig = async ({ messages, maxSteps, credentials }: AgentQueryOptions) => ({
  system: SYSTEM_PROMPT,
  messages: await convertToModelMessages(compact(messages)),
  tools: createTools({ credentials }),
  stopWhen: stepCountIs(maxSteps ?? DEFAULT_MAX_STEPS),
});

export const runAgent = async (options: AgentQueryOptions): Promise<AgentResult> => {
  const result = await generateText({ model: options.model, ...(await sharedCallConfig(options)) });

  const toolResults: ToolResultInput[] = result.toolResults.map(({ toolName, output }) => ({
    toolName,
    output,
  }));
  const toolCalls: AgentToolCall[] = result.toolCalls.map(({ toolName, input }) => ({ toolName, input }));
  const retrievedChunks = extractRetrievedChunks(toolResults);

  // TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
  logGroundednessAudit({
    question: latestUserQuestion(options.messages),
    candidateIds: retrievedChunks.map((chunk) => chunk.candidateId),
    answer: result.text,
  });

  return {
    text: result.text,
    sources: extractSources(toolResults),
    toolCalls,
    retrievedChunks,
  };
};

export const streamAgent = async (options: AgentQueryOptions) =>
  streamText({
    model: options.model,
    ...(await sharedCallConfig(options)),
    // TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
    onFinish: ({ text, toolResults }) => {
      const retrievedChunks = extractRetrievedChunks(
        toolResults.map(({ toolName, output }) => ({ toolName, output })),
      );

      logGroundednessAudit({
        question: latestUserQuestion(options.messages),
        candidateIds: retrievedChunks.map((chunk) => chunk.candidateId),
        answer: text,
      });
    },
  });
