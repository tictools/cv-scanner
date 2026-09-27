import { requireUpstashCredentials } from "../env/upstash-credentials";
import { createVectorIndex } from "../store/vector-index";
import type { RetrievedResult } from "./types";

export interface RetrieveOptions {
  topK: number;
}

export const retrieve = async (
  query: string,
  { topK }: RetrieveOptions,
): Promise<RetrievedResult[]> => {
  const store = createVectorIndex(requireUpstashCredentials());
  const hits = await store.query({ data: query, topK });

  return hits
    .map((hit) => ({
      candidateId: hit.metadata.candidateId,
      source: hit.metadata.source,
      content: hit.metadata.content,
      score: hit.score,
    }))
    .sort((a, b) => b.score - a.score);
};
