import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CVS_DIR } from "../dataset/paths";
import { normalizeText } from "./normalize-text";
import { extractText } from "./pdf-text";

const MAX_WORDS_PER_CV = 500;

const cvFiles = await readdir(CVS_DIR).then(
  (files) => files.filter((file) => file.endsWith(".pdf")),
  () => [],
);

describe.runIf(cvFiles.length > 0)("real CV word budget (design.md Decision 2)", () => {
  it("keeps every generated CV under the no-chunking word budget", async () => {
    for (const file of cvFiles) {
      const text = await extractText({ pdfPath: join(CVS_DIR, file) });
      const wordCount = normalizeText(text).split(/\s+/).filter(Boolean).length;

      expect(wordCount, `${file} has ${wordCount} words`).toBeLessThan(MAX_WORDS_PER_CV);
    }
  });
});
