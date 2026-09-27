import { describe, expect, it, vi } from "vitest";
import type { VectorIndex } from "../store/vector-index";
import { ingest } from "./ingest";

const buildStore = (): VectorIndex => ({
  reset: vi.fn().mockResolvedValue(undefined),
  upsert: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue([]),
});

describe("ingest", () => {
  it("resets the index before upserting any candidate", async () => {
    const store = buildStore();
    const callOrder: string[] = [];
    (store.reset as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("reset");
    });
    (store.upsert as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callOrder.push("upsert");
    });

    await ingest({
      store,
      cvLocations: [{ candidateId: "jane-doe", name: "Jane Doe", pdfPath: "irrelevant.pdf" }],
      extractText: async () => "Jane Doe CV text",
    });

    expect(callOrder[0]).toBe("reset");
  });

  it("upserts one vector per CV location keyed by candidateId with source/candidateId/name/content metadata", async () => {
    const store = buildStore();

    await ingest({
      store,
      cvLocations: [
        { candidateId: "jane-doe", name: "Jane Doe", pdfPath: "data/cvs/jane-doe.pdf" },
        { candidateId: "john-smith", name: "John Smith", pdfPath: "data/cvs/john-smith.pdf" },
      ],
      extractText: async ({ pdfPath }) => `text for ${pdfPath}`,
    });

    expect(store.upsert).toHaveBeenCalledWith({
      id: "jane-doe",
      data: "text for data/cvs/jane-doe.pdf",
      metadata: {
        candidateId: "jane-doe",
        name: "Jane Doe",
        source: "data/cvs/jane-doe.pdf",
        content: "text for data/cvs/jane-doe.pdf",
      },
    });
    expect(store.upsert).toHaveBeenCalledWith({
      id: "john-smith",
      data: "text for data/cvs/john-smith.pdf",
      metadata: {
        candidateId: "john-smith",
        name: "John Smith",
        source: "data/cvs/john-smith.pdf",
        content: "text for data/cvs/john-smith.pdf",
      },
    });
  });

  it("isolates a failing candidate: the rest still get indexed and the failure is reported", async () => {
    const store = buildStore();

    const summary = await ingest({
      store,
      cvLocations: [
        { candidateId: "jane-doe", name: "Jane Doe", pdfPath: "data/cvs/jane-doe.pdf" },
        {
          candidateId: "broken-candidate",
          name: "Broken Candidate",
          pdfPath: "data/cvs/broken-candidate.pdf",
        },
        { candidateId: "john-smith", name: "John Smith", pdfPath: "data/cvs/john-smith.pdf" },
      ],
      extractText: async ({ pdfPath }) => {
        if (pdfPath.includes("broken-candidate")) {
          throw new Error("corrupt PDF");
        }
        return `text for ${pdfPath}`;
      },
    });

    expect(store.upsert).toHaveBeenCalledTimes(2);
    expect(summary.indexed).toEqual(["jane-doe", "john-smith"]);
    expect(summary.failed).toEqual([{ candidateId: "broken-candidate", reason: "corrupt PDF" }]);
  });

  it("reports every candidate indexed when all succeed", async () => {
    const store = buildStore();

    const summary = await ingest({
      store,
      cvLocations: [
        { candidateId: "jane-doe", name: "Jane Doe", pdfPath: "data/cvs/jane-doe.pdf" },
        { candidateId: "john-smith", name: "John Smith", pdfPath: "data/cvs/john-smith.pdf" },
      ],
      extractText: async ({ pdfPath }) => `text for ${pdfPath}`,
    });

    expect(summary.indexed).toEqual(["jane-doe", "john-smith"]);
    expect(summary.failed).toEqual([]);
  });
});
