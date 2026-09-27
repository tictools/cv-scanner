import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractText } from "./pdf-text";

const FIXTURE_PDF = join(import.meta.dirname, "fixtures", "sample.pdf");

describe("extractText", () => {
  it("returns the text content of a real CV PDF", async () => {
    const text = await extractText({ pdfPath: FIXTURE_PDF });

    expect(text).toContain("Jane Fixture");
    expect(text).toContain("Backend Engineer");
    expect(text).toContain("Sample profile text for extraction tests.");
  });

  it("throws an error naming the path when the file is missing", async () => {
    const missingPath = join(import.meta.dirname, "fixtures", "does-not-exist.pdf");

    await expect(extractText({ pdfPath: missingPath })).rejects.toThrow(
      new RegExp(missingPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });

  it("throws an error naming the path when the file is not a valid PDF", async () => {
    const invalidPath = join(import.meta.dirname, "fixtures", "invalid.txt");

    await expect(extractText({ pdfPath: invalidPath })).rejects.toThrow(
      new RegExp(invalidPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });
});
