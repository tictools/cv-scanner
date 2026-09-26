import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import pLimit from "p-limit";
import type { GeminiClient } from "../client/gemini-client";
import type { Candidate, Cv, CvContent } from "../cv/types";
import { cvContentSchema } from "../cv/schema";
import { photoPathFor } from "../output/paths";

const TEXT_MODEL = "gemini-3.8-flash";

/** Bounded in-flight LLM calls, sized conservatively for the Gemini free tier. */
export const LLM_CONCURRENCY = 2;
export const llmLimit = pLimit(LLM_CONCURRENCY);

/** Exported: content.test.ts asserts against it to avoid a magic number. */
export const MAX_ATTEMPTS = 3;

export interface GenerateContentParams {
  client: JsonClient;
  candidate: Candidate;
  /** Directory holding per-candidate content JSON; enables cache-and-skip. */
  cacheDir?: string;
}

type JsonClient = Pick<GeminiClient, "generateJson">;

/**
 * Generates the LLM narrative for a candidate, validated against the Zod schema
 * (retried on failure, never written when invalid), and assembles the full Cv
 * from the candidate's deterministic metadata.
 */
export const generateContent = async ({
  client,
  candidate,
  cacheDir,
}: GenerateContentParams): Promise<Cv> => {
  const content = await getContent({ client, candidate, cacheDir });

  return {
    name: `${candidate.firstName} ${candidate.lastName}`,
    contact: {
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
    },
    photoPath: photoPathFor(candidate.id),
    ...content,
  };
};

interface GetContentParams {
  client: JsonClient;
  candidate: Candidate;
  cacheDir: string | undefined;
}

const getContent = async ({ client, candidate, cacheDir }: GetContentParams): Promise<CvContent> => {
  if (cacheDir) {
    const cached = await readCache(join(cacheDir, `${candidate.id}.json`));
    if (cached) {
      return cached;
    }
  }

  const content = await generateWithRetries({ client, candidate });

  if (cacheDir) {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(join(cacheDir, `${candidate.id}.json`), JSON.stringify(content, null, 2));
  }

  return content;
};

const readCache = async (path: string): Promise<CvContent | null> => {
  try {
    const parsed = cvContentSchema.safeParse(JSON.parse(await readFile(path, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

interface GenerateWithRetriesParams {
  client: JsonClient;
  candidate: Candidate;
}

const generateWithRetries = async ({
  client,
  candidate,
}: GenerateWithRetriesParams): Promise<CvContent> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await client.generateJson({
        model: TEXT_MODEL,
        prompt: buildContentPrompt(candidate),
      });
      const parsed = cvContentSchema.safeParse(raw);
      if (parsed.success) {
        return parsed.data;
      }
      lastError = parsed.error;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Failed to generate valid CV content for candidate ${candidate.id} after ${MAX_ATTEMPTS} attempts`,
    { cause: lastError },
  );
};

const buildContentPrompt = (candidate: Candidate): string => {
  return `You are generating the narrative content of a fictional CV for ${candidate.firstName} ${candidate.lastName}, a ${candidate.seniority} ${candidate.role} in the ${candidate.sector} sector with ${candidate.yearsOfExperience} years of professional experience.

Write all narrative text in ${candidate.language}.

Return ONLY a JSON object with this exact shape (no markdown, no extra keys):
{
  "summary": string,
  "experience": [
    {
      "title": string,
      "company": string,
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM" | null,
      "description": string
    }
  ],
  "education": [
    { "degree": string, "institution": string, "year": string }
  ],
  "skills": [ string ]
}

Requirements:
- "summary" is a 2-4 sentence professional summary.
- "experience" covers roughly the candidate's ${candidate.yearsOfExperience} years of experience; the most recent position has "endDate": null.
- Companies are plausible fictional companies in the ${candidate.sector} sector.
- "skills" lists 6-12 skills realistic for a ${candidate.role}.`;
};
