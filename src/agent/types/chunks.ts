export interface RetrievedChunk {
  candidateId: string;
  candidateName: string;
  source: string;
  content: string;
  score: number;
}

export type ScanCVResultItem = Omit<RetrievedChunk, "content">;
