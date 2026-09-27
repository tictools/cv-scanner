import { Index } from "@upstash/vector";
import type { UpstashCredentials } from "../env/upstash-credentials";

export interface VectorMetadata {
  candidateId: string;
  source: string;
  content: string;
}

export interface UpsertArgs {
  id: string;
  data: string;
  metadata: VectorMetadata;
}

export interface QueryArgs {
  data: string;
  topK: number;
}

export interface QueryHit {
  id: string;
  score: number;
  data: string;
  metadata: VectorMetadata;
}

export interface VectorIndex {
  reset: () => Promise<void>;
  upsert: (args: UpsertArgs) => Promise<void>;
  query: (args: QueryArgs) => Promise<QueryHit[]>;
}

export const createVectorIndex = ({ url, token }: UpstashCredentials): VectorIndex => {
  const index = new Index({ url, token });

  return {
    reset: async () => {
      await index.reset();
    },
    upsert: async ({ id, data, metadata }: UpsertArgs) => {
      await index.upsert({ id, data, metadata: metadata as unknown as Record<string, unknown> });
    },
    query: async ({ data, topK }: QueryArgs) => {
      const hits = await index.query({ data, topK, includeData: true, includeMetadata: true });

      return hits as unknown as QueryHit[];
    },
  };
};
