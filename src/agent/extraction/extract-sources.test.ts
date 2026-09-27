import { describe, expect, it } from "vitest";
import { extractSources } from "./extract-sources";

describe("extractSources", () => {
  it("builds a SourceReference per candidate from scan-cv tool results", () => {
    const sources = extractSources([
      {
        toolName: "scan-cv",
        output: [
          {
            candidateId: "jane-doe",
            candidateName: "Jane Doe",
            source: "data/cvs/jane-doe.pdf",
            content: "Jane Doe CV text",
            score: 0.8,
          },
        ],
      },
    ]);

    expect(sources).toEqual([
      { candidateId: "jane-doe", candidateName: "Jane Doe", source: "data/cvs/jane-doe.pdf", score: 0.8 },
    ]);
  });

  it("de-duplicates a candidate retrieved by two tool calls, keeping the higher score", () => {
    const sources = extractSources([
      {
        toolName: "scan-cv",
        output: [
          {
            candidateId: "jane-doe",
            candidateName: "Jane Doe",
            source: "data/cvs/jane-doe.pdf",
            content: "text",
            score: 0.4,
          },
        ],
      },
      {
        toolName: "scan-cv",
        output: [
          {
            candidateId: "jane-doe",
            candidateName: "Jane Doe",
            source: "data/cvs/jane-doe.pdf",
            content: "text",
            score: 0.9,
          },
        ],
      },
    ]);

    expect(sources).toEqual([
      { candidateId: "jane-doe", candidateName: "Jane Doe", source: "data/cvs/jane-doe.pdf", score: 0.9 },
    ]);
  });

  it("orders sources by descending score", () => {
    const sources = extractSources([
      {
        toolName: "scan-cv",
        output: [
          {
            candidateId: "a",
            candidateName: "A",
            source: "a.pdf",
            content: "a",
            score: 0.2,
          },
          {
            candidateId: "b",
            candidateName: "B",
            source: "b.pdf",
            content: "b",
            score: 0.9,
          },
        ],
      },
    ]);

    expect(sources.map((source) => source.candidateId)).toEqual(["b", "a"]);
  });

  it("returns zero sources when no tool was called", () => {
    expect(extractSources([])).toEqual([]);
  });

  it("returns zero sources when the tool result carries an error instead of results", () => {
    const sources = extractSources([
      { toolName: "scan-cv", output: { error: "vector store unreachable" } },
    ]);

    expect(sources).toEqual([]);
  });

  it("ignores tool results from tools other than scan-cv", () => {
    const sources = extractSources([
      { toolName: "some-other-tool", output: [{ candidateId: "x", candidateName: "X", source: "x.pdf", content: "x", score: 1 }] },
    ]);

    expect(sources).toEqual([]);
  });

  it("does not build a URL: source stays the repo-relative path as returned by the tool", () => {
    const sources = extractSources([
      {
        toolName: "scan-cv",
        output: [
          {
            candidateId: "jane-doe",
            candidateName: "Jane Doe",
            source: "data/cvs/jane-doe.pdf",
            content: "text",
            score: 0.5,
          },
        ],
      },
    ]);

    expect(sources[0]?.source).toBe("data/cvs/jane-doe.pdf");
  });
});
