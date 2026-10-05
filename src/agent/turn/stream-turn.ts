import { streamText } from "ai";
import { extractScanCVChunks } from "../extraction/scan-cv-chunks";
import type { TurnOptions } from "../types/turn";
// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
import { logGroundednessAudit } from "./groundedness-audit-log";
import { latestUserQuestion } from "./latest-user-question";
import { buildTurnConfig } from "./turn-config";

export const streamTurn = async (options: TurnOptions) =>
  streamText({
    model: options.model,
    ...(await buildTurnConfig(options)),
    // TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
    onFinish: ({ text, toolResults }) => {
      const retrievedChunks = extractScanCVChunks(
        toolResults.map(({ toolName, output }) => ({ toolName, output })),
      );

      logGroundednessAudit({
        question: latestUserQuestion(options.messages),
        candidateIds: retrievedChunks.map((chunk) => chunk.candidateId),
        answer: text,
      });
    },
  });
