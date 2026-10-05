import { SCAN_CV_TOOL_NAME } from "../tools/scan-cv";
import type { SourceReference } from "../types/sources";
import type { ToolResultInput } from "../types/tools";
import { isScanCVResultItems } from "./is-scan-cv-result-items";

export const extractScanCVSources = (toolResults: ToolResultInput[]): SourceReference[] => {
  const items = toolResults
    .filter((result) => result.toolName === SCAN_CV_TOOL_NAME)
    .flatMap((result) => (isScanCVResultItems(result.output) ? result.output : []));

  const bestByCandidateId = new Map<string, SourceReference>();

  for (const { candidateId, candidateName, source, score } of items) {
    const existing = bestByCandidateId.get(candidateId);

    if (!existing || score > existing.score) {
      bestByCandidateId.set(candidateId, { candidateId, candidateName, source, score });
    }
  }

  return Array.from(bestByCandidateId.values()).sort((a, b) => b.score - a.score);
};
