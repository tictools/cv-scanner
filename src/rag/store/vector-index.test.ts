import { describe, expect, it, vi } from "vitest";
import { createVectorIndex } from "./vector-index";

const { mockIndexConstructor, mockReset, mockUpsert, mockQuery } = vi.hoisted(() => ({
  mockIndexConstructor: vi.fn(),
  mockReset: vi.fn(),
  mockUpsert: vi.fn(),
  mockQuery: vi.fn(),
}));

vi.mock("@upstash/vector", () => ({
  Index: class {
    constructor(config: unknown) {
      mockIndexConstructor(config);
    }

    reset = mockReset;
    upsert = mockUpsert;
    query = mockQuery;
  },
}));

describe("createVectorIndex", () => {
  it("builds the underlying index from the credentials contract", () => {
    createVectorIndex({ url: "https://example.upstash.io", token: "token" });

    expect(mockIndexConstructor).toHaveBeenCalledWith({
      url: "https://example.upstash.io",
      token: "token",
    });
  });

  it("exposes only reset, upsert and query", () => {
    const vectorIndex = createVectorIndex({ url: "https://example.upstash.io", token: "token" });

    expect(Object.keys(vectorIndex).sort()).toEqual(["query", "reset", "upsert"]);
  });

  it("delegates reset to the underlying index", async () => {
    const vectorIndex = createVectorIndex({ url: "https://example.upstash.io", token: "token" });

    await vectorIndex.reset();

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("delegates upsert to the underlying index, sending text as data", async () => {
    const vectorIndex = createVectorIndex({ url: "https://example.upstash.io", token: "token" });

    await vectorIndex.upsert({
      id: "jane-doe",
      data: "Jane Doe's CV text",
      metadata: {
        candidateId: "jane-doe",
        name: "Jane Doe",
        source: "data/cvs/jane-doe.pdf",
        content: "Jane Doe's CV text",
      },
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      id: "jane-doe",
      data: "Jane Doe's CV text",
      metadata: {
        candidateId: "jane-doe",
        name: "Jane Doe",
        source: "data/cvs/jane-doe.pdf",
        content: "Jane Doe's CV text",
      },
    });
  });

  it("delegates query to the underlying index, sending the query text as data", async () => {
    const metadata = {
      candidateId: "jane-doe",
      name: "Jane Doe",
      source: "data/cvs/jane-doe.pdf",
      content: "Jane Doe's CV text",
    };
    mockQuery.mockResolvedValue([
      { id: "jane-doe", score: 0.9, data: "Jane Doe's CV text", metadata },
    ]);
    const vectorIndex = createVectorIndex({ url: "https://example.upstash.io", token: "token" });

    const results = await vectorIndex.query({ data: "backend engineer", topK: 3 });

    expect(mockQuery).toHaveBeenCalledWith({
      data: "backend engineer",
      topK: 3,
      includeData: true,
      includeMetadata: true,
    });
    expect(results).toEqual([
      { id: "jane-doe", score: 0.9, data: "Jane Doe's CV text", metadata },
    ]);
  });
});
