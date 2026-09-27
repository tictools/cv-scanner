import { describe, expect, it } from "vitest";
import { pdfUrl } from "./pdf-url";

describe("pdfUrl", () => {
  it("replaces a leading data/ with / so the path resolves against the Vite public directory", () => {
    expect(pdfUrl("data/cvs/jane-doe.pdf")).toBe("/cvs/jane-doe.pdf");
  });

  it("returns the path unchanged when it has no data/ prefix", () => {
    expect(pdfUrl("cvs/jane-doe.pdf")).toBe("cvs/jane-doe.pdf");
  });
});
