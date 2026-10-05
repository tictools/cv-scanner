import { generateText } from "ai";
import { extractScanCVChunks } from "../extraction/scan-cv-chunks";
import { extractScanCVSources } from "../extraction/scan-cv-sources";
import type { AgentResult, AgentToolCall, TurnOptions } from "../types/turn";
import type { ToolResultInput } from "../types/tools";
// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
import { logGroundednessAudit } from "./groundedness-audit-log";
import { latestUserQuestion } from "./latest-user-question";
import { buildTurnConfig } from "./turn-config";

export const runTurn = async (options: TurnOptions): Promise<AgentResult> => {
  const result = await generateText({ model: options.model, ...(await buildTurnConfig(options)) });

  const toolResults: ToolResultInput[] = result.toolResults.map(({ toolName, output }) => ({
    toolName,
    output,
  }));
  const toolCalls: AgentToolCall[] = result.toolCalls.map(({ toolName, input }) => ({ toolName, input }));
  const retrievedChunks = extractScanCVChunks(toolResults);

  // TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
  logGroundednessAudit({
    question: latestUserQuestion(options.messages),
    candidateIds: retrievedChunks.map((chunk) => chunk.candidateId),
    answer: result.text,
  });

  return {
    text: result.text,
    sources: extractScanCVSources(toolResults),
    toolCalls,
    retrievedChunks,
  };
};
