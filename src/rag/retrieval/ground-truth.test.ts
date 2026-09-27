/**
 * The only end-to-end test that validates retrieval directly from Upstash via
 * `index.query`. Once a case has been validated it stays on `it.skip`, so the
 * suite does not make unnecessary calls to the service.
 */
import "dotenv/config";
import { describe, expect, it } from "vitest";
import { retrieve } from "./retrieve";

const hasUpstashCredentials = Boolean(
  process.env.UPSTASH_VECTOR_REST_URL?.trim() &&
  process.env.UPSTASH_VECTOR_REST_TOKEN?.trim(),
);

const TOP_K = 5;

describe.skipIf(!hasUpstashCredentials)(
  "retrieve (manifest ground truth)",
  () => {
    it.skip("retrieves the candidate whose manifest lists a skill unique to them", async () => {
      const results = await retrieve("FastAPI", { topK: TOP_K });

      expect(results.map((result) => result.candidateId)).toContain(
        "nikita-crist",
      );
    });

    it.skip("retrieves a candidate across languages: an English query surfaces a Catalan-language CV", async () => {
      const results = await retrieve("time series analysis", { topK: TOP_K });

      expect(results.map((result) => result.candidateId)).toContain(
        "floy-keebler",
      );
    });

    it.skip("returns candidateName populated on live results after re-ingestion", async () => {
      const results = await retrieve("FastAPI", { topK: TOP_K });

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.candidateName.trim().length).toBeGreaterThan(0);
      }
    });
  },
);
