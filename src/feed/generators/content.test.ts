import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiClient } from "../client/gemini-client";
import type { Candidate, CvContent } from "../cv/types";
import { generateContent, LLM_CONCURRENCY, llmLimit, MAX_ATTEMPTS } from "./content";

const ATTEMPTS_ON_RETRY_SUCCESS = 2;
const CONCURRENT_TASK_COUNT = 10;

const candidate: Candidate = {
  id: "jane-doe",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane.doe@example.com",
  phone: "+34 600 123 456",
  location: "Barcelona, Spain",
  role: "Backend Engineer",
  seniority: "senior",
  sector: "Fintech",
  language: "English",
  yearsOfExperience: 8,
  appearance: { ageRange: "33-40", gender: "female", ethnicity: "Southern European" },
};

const validContent: CvContent = {
  summary: "Backend engineer with 8 years in fintech.",
  experience: [
    {
      title: "Backend Engineer",
      company: "Acme Corp",
      startDate: "2020-01",
      endDate: null,
      description: "Owns the payments API.",
    },
  ],
  education: [{ degree: "BSc Computer Science", institution: "UB", year: "2015" }],
  skills: ["TypeScript", "Node.js", "PostgreSQL"],
};

const clientReturning = (...jsonResponses: unknown[]) => {
  const generateJson = vi.fn();
  for (const response of jsonResponses) {
    generateJson.mockResolvedValueOnce(response);
  }

  return { generateJson } as unknown as Pick<GeminiClient, "generateJson">;
};

describe("generateContent", () => {
  it("returns a usable Cv from valid structured output", async () => {
    const client = clientReturning(validContent);

    const cv = await generateContent({ client, candidate });

    expect(cv.name).toBe("Jane Doe");
    expect(cv.contact).toEqual({
      email: "jane.doe@example.com",
      phone: "+34 600 123 456",
      location: "Barcelona, Spain",
    });
    expect(cv.photoPath).toBe("data/photos/jane-doe.png");
    expect(cv.summary).toBe(validContent.summary);
    expect(cv.experience).toEqual(validContent.experience);
    expect(cv.education).toEqual(validContent.education);
    expect(cv.skills).toEqual(validContent.skills);
  });

  it("sends a prompt built from the candidate metadata", async () => {
    const client = clientReturning(validContent);

    await generateContent({ client, candidate });

    const prompt = vi.mocked(client.generateJson).mock.calls[0]![0].prompt;
    expect(prompt).toContain("Jane Doe");
    expect(prompt).toContain("Backend Engineer");
    expect(prompt).toContain("senior");
    expect(prompt).toContain("Fintech");
    expect(prompt).toContain("English");
    expect(prompt).toContain("8");
  });

  it("retries when the response fails schema validation, and never returns invalid data", async () => {
    const invalid = { summary: "", experience: [], education: [], skills: [] };
    const client = clientReturning(invalid, validContent);

    const cv = await generateContent({ client, candidate });

    expect(client.generateJson).toHaveBeenCalledTimes(ATTEMPTS_ON_RETRY_SUCCESS);
    expect(cv.summary).toBe(validContent.summary);
  });

  it("retries when the client call fails", async () => {
    const generateJson = vi
      .fn()
      .mockRejectedValueOnce(new Error("429 rate limit exceeded"))
      .mockResolvedValueOnce(validContent);
    const client = { generateJson } as unknown as Pick<GeminiClient, "generateJson">;

    const cv = await generateContent({ client, candidate });

    expect(generateJson).toHaveBeenCalledTimes(ATTEMPTS_ON_RETRY_SUCCESS);
    expect(cv.skills).toEqual(validContent.skills);
  });

  it("throws after exhausting retries on invalid responses", async () => {
    const invalid = { nope: true };
    const client = clientReturning(...Array.from({ length: MAX_ATTEMPTS }, () => invalid));

    await expect(generateContent({ client, candidate })).rejects.toThrow(/jane-doe/);
  });
});

describe("llmLimit", () => {
  it("never runs more than the configured number of tasks concurrently", async () => {
    let active = 0;
    let maxActive = 0;
    const task = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
    };

    await Promise.all(Array.from({ length: CONCURRENT_TASK_COUNT }, () => llmLimit(task)));

    expect(maxActive).toBeLessThanOrEqual(LLM_CONCURRENCY);
    expect(LLM_CONCURRENCY).toBeGreaterThan(0);
  });
});

describe("content cache", () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "cv-content-cache-"));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("reuses existing content JSON without calling the client", async () => {
    await writeFile(join(cacheDir, "jane-doe.json"), JSON.stringify(validContent));
    const client = clientReturning();

    const cv = await generateContent({ client, candidate, cacheDir });

    expect(client.generateJson).not.toHaveBeenCalled();
    expect(cv.summary).toBe(validContent.summary);
    expect(cv.skills).toEqual(validContent.skills);
  });

  it("writes generated content to the cache", async () => {
    const client = clientReturning(validContent);

    await generateContent({ client, candidate, cacheDir });

    await expect(readdir(cacheDir)).resolves.toContain("jane-doe.json");

    const client2 = clientReturning();
    const cv = await generateContent({ client: client2, candidate, cacheDir });

    expect(client2.generateJson).not.toHaveBeenCalled();
    expect(cv.summary).toBe(validContent.summary);
  });

  it("regenerates when the cached file is not valid content", async () => {
    await writeFile(join(cacheDir, "jane-doe.json"), "{corrupt");
    const client = clientReturning(validContent);

    const cv = await generateContent({ client, candidate, cacheDir });

    expect(client.generateJson).toHaveBeenCalledTimes(1);
    expect(cv.summary).toBe(validContent.summary);
  });

  it("writes nothing to the cache when generation fails", async () => {
    const invalid = { nope: true };
    const client = clientReturning(...Array.from({ length: MAX_ATTEMPTS }, () => invalid));

    await expect(generateContent({ client, candidate, cacheDir })).rejects.toThrow();

    await expect(readdir(cacheDir)).resolves.toEqual([]);
  });
});
