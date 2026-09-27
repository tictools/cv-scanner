export interface SourceReference {
  candidateId: string;
  candidateName: string;
  source: string;
  score: number;
}

interface ScanCVResultItem {
  candidateId: string;
  candidateName: string;
  source: string;
  score: number;
}

export interface ToolResultInput {
  toolName: string;
  output: unknown;
}

const SCAN_CV_TOOL_NAME = "scan-cv";

const isScanCVResultItems = (output: unknown): output is ScanCVResultItem[] => Array.isArray(output);

export const extractSources = (toolResults: ToolResultInput[]): SourceReference[] => {
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
