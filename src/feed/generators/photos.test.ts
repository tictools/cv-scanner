import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiClient } from "../client/gemini-client";
import type { Candidate } from "../cv/types";
import { generatePhoto } from "./photos";

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

const PNG_BYTES = Buffer.from("fake-png-bytes");

const clientReturning = (bytes: Buffer) => {
  return {
    generateImageBytes: vi.fn().mockResolvedValue(bytes),
  } as unknown as Pick<GeminiClient, "generateImageBytes">;
};

describe("generatePhoto", () => {
  let photosDir: string;

  beforeEach(async () => {
    photosDir = await mkdtemp(join(tmpdir(), "cv-photos-"));
  });

  afterEach(async () => {
    await rm(photosDir, { recursive: true, force: true });
  });

  it("saves the PNG to {photosDir}/{candidateId}.png and returns its path", async () => {
    const client = clientReturning(PNG_BYTES);

    const photoPath = await generatePhoto({ client, candidate, photosDir });

    expect(photoPath).toBe(join(photosDir, "jane-doe.png"));
    await expect(readFile(photoPath)).resolves.toEqual(PNG_BYTES);
  });

  it("skips the client call when the photo already exists", async () => {
    const existing = join(photosDir, "jane-doe.png");
    await writeFile(existing, PNG_BYTES);
    const client = clientReturning(PNG_BYTES);

    const photoPath = await generatePhoto({ client, candidate, photosDir });

    expect(client.generateImageBytes).not.toHaveBeenCalled();
    expect(photoPath).toBe(existing);
  });

  it("builds the prompt from the candidate's appearance attributes", async () => {
    const client = clientReturning(PNG_BYTES);

    await generatePhoto({ client, candidate, photosDir });

    const prompt = vi.mocked(client.generateImageBytes).mock.calls[0]![0].prompt;
    expect(prompt).toContain("33-40");
    expect(prompt).toContain("female");
    expect(prompt).toContain("Southern European");
    expect(prompt.toLowerCase()).toContain("portrait");
  });

  it("propagates client errors", async () => {
    const client = {
      generateImageBytes: vi.fn().mockRejectedValue(new Error("503 service unavailable")),
    } as unknown as Pick<GeminiClient, "generateImageBytes">;

    await expect(generatePhoto({ client, candidate, photosDir })).rejects.toThrow(
      "503 service unavailable",
    );
  });
});
