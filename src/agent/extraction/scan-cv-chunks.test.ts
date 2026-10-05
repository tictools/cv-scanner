import { describe, expect, it } from "vitest";
import { extractScanCVChunks } from "./scan-cv-chunks";

const NIKITA_CHUNK = {
  candidateId: "nikita-crist",
  candidateName: "Nikita Crist",
  source: "data/cvs/nikita-crist.pdf",
  content: "Nikita Crist has FastAPI experience.",
  score: 0.9,
};

describe("extractScanCVChunks", () => {
  it("returns the full chunks, content included, from scan-cv tool results", () => {
    const chunks = extractScanCVChunks([{ toolName: "scan-cv", output: [NIKITA_CHUNK] }]);

    expect(chunks).toEqual([NIKITA_CHUNK]);
  });

  it("ignores results from any other tool", () => {
    const chunks = extractScanCVChunks([
      { toolName: "scan-cv", output: [NIKITA_CHUNK] },
      { toolName: "other-tool", output: [{ ...NIKITA_CHUNK, candidateId: "someone-else" }] },
    ]);

    expect(chunks).toEqual([NIKITA_CHUNK]);
  });

  it("yields nothing when a scan-cv result is an error object rather than a list", () => {
    const chunks = extractScanCVChunks([{ toolName: "scan-cv", output: { error: "vector store unreachable" } }]);

    expect(chunks).toEqual([]);
  });

  it("yields nothing for an empty list of tool results", () => {
    expect(extractScanCVChunks([])).toEqual([]);
  });
});
