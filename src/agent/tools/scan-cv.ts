import { retrieve } from "@rag/retrieval/retrieve";
import { tool } from "ai";
import { z } from "zod";
import type { CreateScanCVToolOptions } from "../types/tools";

export const SCAN_CV_TOOL_NAME = "scan-cv";

export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 10;

export const ScanCVInputSchema = z.object({
  query: z
    .string()
    .describe("The natural-language question, skill, or technology to search the CV collection for."),
  topK: z
    .number()
    .int()
    .max(MAX_TOP_K)
    .optional()
    .describe(`Number of CVs to retrieve, ordered by relevance (default ${DEFAULT_TOP_K}, max ${MAX_TOP_K}).`),
});

export const createScanCVTool = ({ resolveCredentials }: CreateScanCVToolOptions) =>
  tool({
    description:
      "Search the CV collection for candidates matching a query (a skill, technology, role, or free-text question). Returns each matching candidate's id, name, source PDF path, CV text, and relevance score.",
    inputSchema: ScanCVInputSchema,
    execute: async ({ query, topK }) => {
      try {
        const credentials = await resolveCredentials?.();

        const results = await retrieve(query, { topK: topK ?? DEFAULT_TOP_K, credentials });

        return results.map(({ candidateId, candidateName, source, content, score }) => ({
          candidateId,
          candidateName,
          source,
          content,
          score,
        }));
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
  });
