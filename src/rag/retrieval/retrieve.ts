import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { requireUpstashCredentials, type UpstashCredentials } from "../env/upstash-credentials";
import { createVectorIndex } from "../store/vector-index";
import type { RetrievedResult } from "./types";

export interface RetrieveOptions {
  topK: number;
  credentials?: Maybe<UpstashCredentials>;
}

export const retrieve = async (
  query: string,
  { topK, credentials = requireUpstashCredentials() }: RetrieveOptions,
): Promise<RetrievedResult[]> => {
  const store = createVectorIndex(credentials);
  const hits = await store.query({ data: query, topK });

  return hits
    .map((hit) => ({
      candidateId: hit.metadata.candidateId,
      candidateName: hit.metadata.name,
      source: hit.metadata.source,
      content: hit.metadata.content,
      score: hit.score,
    }))
    .sort((a, b) => b.score - a.score);
};
