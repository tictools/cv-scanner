import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CVS_DIR, DATA_DIR, MANIFEST_PATH, readCvLocations } from "./paths";

describe("dataset paths", () => {
  it("resolves rag's own data/ locations", () => {
    expect(DATA_DIR).toBe("data");
    expect(CVS_DIR).toBe("data/cvs");
    expect(MANIFEST_PATH).toBe("data/manifest.json");
  });
});

describe("readCvLocations", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "rag-manifest-"));
  });

  afterEach(async () => {
    await rm(dataDir, { recursive: true, force: true });
  });

  it("reads one candidateId/pdfPath location per manifest entry", async () => {
    const manifestPath = join(dataDir, "manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify([
        { candidateId: "nikita-crist", pdfPath: "data/cvs/nikita-crist.pdf" },
        { candidateId: "carolina-wintheiser", pdfPath: "data/cvs/carolina-wintheiser.pdf" },
      ]),
    );

    const locations = await readCvLocations(manifestPath);

    expect(locations).toEqual([
      { candidateId: "nikita-crist", pdfPath: "data/cvs/nikita-crist.pdf" },
      { candidateId: "carolina-wintheiser", pdfPath: "data/cvs/carolina-wintheiser.pdf" },
    ]);
  });

  it("keeps only candidateId and pdfPath even when the manifest has extra fields", async () => {
    const manifestPath = join(dataDir, "manifest.json");
    await writeFile(
      manifestPath,
      JSON.stringify([
        {
          candidateId: "nikita-crist",
          name: "Nikita Crist",
          role: "Backend Engineer",
          skills: ["Python"],
          pdfPath: "data/cvs/nikita-crist.pdf",
        },
      ]),
    );

    const locations = await readCvLocations(manifestPath);

    expect(locations).toEqual([
      { candidateId: "nikita-crist", pdfPath: "data/cvs/nikita-crist.pdf" },
    ]);
  });
});
