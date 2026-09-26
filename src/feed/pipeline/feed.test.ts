import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GeminiClient } from "../client/gemini-client";
import type { Candidate, Cv } from "../cv/types";
import { generateCandidates } from "../generators/candidates";
import { generateContent } from "../generators/content";
import { generatePhoto } from "../generators/photos";
import { renderCvPdf } from "../render/pdf-renderer";
import { feed, type ManifestEntry } from "./feed";

vi.mock("../generators/candidates", () => ({ generateCandidates: vi.fn() }));
vi.mock("../generators/content", () => ({
  generateContent: vi.fn(),
  llmLimit: (fn: () => unknown) => fn(),
}));
vi.mock("../generators/photos", () => ({ generatePhoto: vi.fn() }));
vi.mock("../render/pdf-renderer", () => ({ renderCvPdf: vi.fn() }));

const makeCandidate = ({ id, role }: { id: string; role: string }): Candidate => {
  const [firstName, lastName] = id.split("-").map((part) => part[0]!.toUpperCase() + part.slice(1));

  return {
    id,
    firstName: firstName!,
    lastName: lastName!,
    email: `${id}@example.com`,
    phone: "+34 600 123 456",
    location: "Barcelona, Spain",
    role,
    seniority: "senior",
    sector: "Fintech",
    language: "English",
    yearsOfExperience: 8,
    appearance: { ageRange: "33-40", gender: "female", ethnicity: "Southern European" },
  };
};

const makeCv = ({ candidate, skills }: { candidate: Candidate; skills: string[] }): Cv => {
  return {
    name: `${candidate.firstName} ${candidate.lastName}`,
    contact: { email: candidate.email, phone: candidate.phone, location: candidate.location },
    photoPath: `data/photos/${candidate.id}.png`,
    summary: "A summary.",
    experience: [
      {
        title: candidate.role,
        company: "Acme Corp",
        startDate: "2020-01",
        endDate: null,
        description: "Does things.",
      },
    ],
    education: [{ degree: "BSc CS", institution: "UB", year: "2015" }],
    skills,
  };
};

const candidates = [
  makeCandidate({ id: "jane-doe", role: "Backend Engineer" }),
  makeCandidate({ id: "john-smith", role: "Data Scientist" }),
];
const cvs = [
  makeCv({ candidate: candidates[0]!, skills: ["TypeScript", "Node.js"] }),
  makeCv({ candidate: candidates[1]!, skills: ["Python", "Pandas"] }),
];

const client = {} as GeminiClient;

describe("feed", () => {
  let dataDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dataDir = await mkdtemp(join(tmpdir(), "cv-feed-"));

    vi.mocked(generateCandidates).mockReturnValue(candidates);
    vi.mocked(generateContent).mockImplementation(async ({ candidate }) =>
      candidate.id === "jane-doe" ? cvs[0]! : cvs[1]!,
    );
    vi.mocked(generatePhoto).mockImplementation(async ({ candidate, photosDir }) =>
      join(photosDir ?? "", `${candidate.id}.png`),
    );
    vi.mocked(renderCvPdf).mockImplementation(async ({ outputDir, fileBaseName }) =>
      join(outputDir ?? "", `${fileBaseName ?? "cv"}.pdf`),
    );
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("returns one manifest entry per CV with candidateId, name, role, skills and PDF path", async () => {
    const entries = await feed({ client, dataDir });

    expect(entries).toEqual<ManifestEntry[]>([
      {
        candidateId: "jane-doe",
        name: "Jane Doe",
        role: "Backend Engineer",
        skills: ["TypeScript", "Node.js"],
        pdfPath: join(dataDir, "cvs", "jane-doe.pdf"),
      },
      {
        candidateId: "john-smith",
        name: "John Smith",
        role: "Data Scientist",
        skills: ["Python", "Pandas"],
        pdfPath: join(dataDir, "cvs", "john-smith.pdf"),
      },
    ]);
  });

  it("writes the manifest to {dataDir}/manifest.json", async () => {
    const entries = await feed({ client, dataDir });

    const manifest = JSON.parse(await readFile(join(dataDir, "manifest.json"), "utf8"));
    expect(manifest).toEqual(entries);
  });

  it("runs content, photo and PDF in order for each candidate", async () => {
    await feed({ client, dataDir });

    for (const [index] of candidates.entries()) {
      const contentOrder = vi.mocked(generateContent).mock.invocationCallOrder[index]!;
      const photoOrder = vi.mocked(generatePhoto).mock.invocationCallOrder[index]!;
      const pdfOrder = vi.mocked(renderCvPdf).mock.invocationCallOrder[index]!;
      expect(contentOrder).toBeLessThan(photoOrder);
      expect(photoOrder).toBeLessThan(pdfOrder);
    }
  });

  it("threads the client through to content and photo generators", async () => {
    await feed({ client, dataDir });

    expect(vi.mocked(generateContent).mock.calls[0]![0].client).toBe(client);
    expect(vi.mocked(generatePhoto).mock.calls[0]![0].client).toBe(client);
  });

  it("derives cache, photos and cvs directories from dataDir", async () => {
    await feed({ client, dataDir });

    expect(vi.mocked(generateContent).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ cacheDir: join(dataDir, "content") }),
    );
    expect(vi.mocked(generatePhoto).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ photosDir: join(dataDir, "photos") }),
    );
    expect(vi.mocked(renderCvPdf).mock.calls[0]![0]).toEqual(
      expect.objectContaining({ outputDir: join(dataDir, "cvs"), fileBaseName: "jane-doe" }),
    );
  });

  it("alternates templates across CVs for visual variety", async () => {
    await feed({ client, dataDir });

    const templates = vi.mocked(renderCvPdf).mock.calls.map((call) => call[0]?.template);
    expect(templates).toEqual(["modern", "classic"]);
  });
});
