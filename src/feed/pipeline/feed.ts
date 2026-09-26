import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeminiClient } from "../client/gemini-client";
import { generateCandidates } from "../generators/candidates";
import { generateContent, llmLimit } from "../generators/content";
import { generatePhoto } from "../generators/photos";
import { renderCvPdf } from "../render/pdf-renderer";
import { TEMPLATES, type TemplateName } from "../templates";

export interface ManifestEntry {
  candidateId: string;
  name: string;
  role: string;
  skills: string[];
  pdfPath: string;
}

export interface FeedParams {
  client: GeminiClient;
  dataDir: string;
}

/**
 * Full pipeline: candidates -> content -> photo -> PDF, per candidate, writing
 * `{dataDir}/manifest.json` as ground truth for later RAG validation.
 */
export const feed = async ({
  client,
  dataDir,
}: FeedParams): Promise<ManifestEntry[]> => {
  const cacheDir = join(dataDir, "content");
  const photosDir = join(dataDir, "photos");
  const cvsDir = join(dataDir, "cvs");

  const candidates = generateCandidates();

  const entries = await Promise.all(
    candidates.map(async (candidate, index) => {
      const cv = await llmLimit(() =>
        generateContent({ client, candidate, cacheDir }),
      );
      await llmLimit(() => generatePhoto({ client, candidate, photosDir }));
      const template: TemplateName = TEMPLATES[index % TEMPLATES.length]!;
      const pdfPath = await renderCvPdf({
        cv,
        outputDir: cvsDir,
        fileBaseName: candidate.id,
        template,
      });

      return {
        candidateId: candidate.id,
        name: cv.name,
        role: candidate.role,
        skills: cv.skills,
        pdfPath,
      };
    }),
  );

  await mkdir(dataDir, { recursive: true });
  await writeFile(
    join(dataDir, "manifest.json"),
    JSON.stringify(entries, null, 2),
  );

  return entries;
};
