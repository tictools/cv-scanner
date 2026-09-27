import type { SourceReference } from "../extraction/extract-sources";

export type { SourceReference };

export interface AgentToolCall {
  toolName: string;
  input: unknown;
}

export interface RetrievedChunk {
  candidateId: string;
  candidateName: string;
  source: string;
  content: string;
  score: number;
}

export interface AgentResult {
  text: string;
  sources: SourceReference[];
  toolCalls: AgentToolCall[];
  retrievedChunks: RetrievedChunk[];
}
