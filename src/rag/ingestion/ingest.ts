import type { CvLocation } from "../dataset/paths";
import { normalizeText } from "../extraction/normalize-text";
import { extractText as extractPdfText } from "../extraction/pdf-text";
import type { VectorIndex } from "../store/vector-index";

export interface IngestSummary {
  indexed: string[];
  failed: { candidateId: string; reason: string }[];
}

export interface IngestParams {
  store: VectorIndex;
  cvLocations: CvLocation[];
  extractText?: (options: { pdfPath: string }) => Promise<string>;
}

export const ingest = async ({
  store,
  cvLocations,
  extractText = extractPdfText,
}: IngestParams): Promise<IngestSummary> => {
  await store.reset();

  const results = await Promise.all(
    cvLocations.map(async ({ candidateId, pdfPath }) => {
      try {
        const text = await extractText({ pdfPath });
        const content = normalizeText(text);

        await store.upsert({
          id: candidateId,
          data: content,
          metadata: { candidateId, source: pdfPath, content },
        });

        return { candidateId, ok: true as const };
      } catch (error) {
        return {
          candidateId,
          ok: false as const,
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  return {
    indexed: results.filter((result) => result.ok).map((result) => result.candidateId),
    failed: results
      .filter((result): result is { candidateId: string; ok: false; reason: string } => !result.ok)
      .map(({ candidateId, reason }) => ({ candidateId, reason })),
  };
};
