import { describe, expect, it, vi } from "vitest";
import { retrieve } from "./retrieve";

const { mockCreateVectorIndex, mockQuery } = vi.hoisted(() => ({
  mockCreateVectorIndex: vi.fn(),
  mockQuery: vi.fn(),
}));

vi.mock("../env/upstash-credentials", () => ({
  requireUpstashCredentials: () => ({
    url: "https://example.upstash.io",
    token: "token",
  }),
}));

vi.mock("../store/vector-index", () => ({
  createVectorIndex: (...args: unknown[]) => {
    mockCreateVectorIndex(...args);
    return { query: mockQuery, reset: vi.fn(), upsert: vi.fn() };
  },
}));

describe("retrieve", () => {
  it("maps store hits to candidateId/source/content/score", async () => {
    mockQuery.mockResolvedValue([
      {
        id: "jane-doe",
        score: 0.5,
        data: "irrelevant",
        metadata: {
          candidateId: "jane-doe",
          source: "data/cvs/jane-doe.pdf",
          content: "Jane Doe CV text",
        },
      },
    ]);

    const results = await retrieve("backend engineer", { topK: 5 });

    expect(results).toEqual([
      {
        candidateId: "jane-doe",
        source: "data/cvs/jane-doe.pdf",
        content: "Jane Doe CV text",
        score: 0.5,
      },
    ]);
  });

  it("honours topK by passing it through to the store", async () => {
    mockQuery.mockResolvedValue([]);

    await retrieve("backend engineer", { topK: 3 });

    expect(mockQuery).toHaveBeenCalledWith({
      data: "backend engineer",
      topK: 3,
    });
  });

  it("sorts results by descending score", async () => {
    mockQuery.mockResolvedValue([
      {
        id: "a",
        score: 0.2,
        data: "",
        metadata: { candidateId: "a", source: "a.pdf", content: "a" },
      },
      {
        id: "b",
        score: 0.9,
        data: "",
        metadata: { candidateId: "b", source: "b.pdf", content: "b" },
      },
    ]);

    const results = await retrieve("query", { topK: 5 });

    expect(results.map((result) => result.candidateId)).toEqual(["b", "a"]);
  });

  it("returns an empty list on an empty index rather than raising", async () => {
    mockQuery.mockResolvedValue([]);

    const results = await retrieve("query", { topK: 5 });

    expect(results).toEqual([]);
  });

  it("applies no score threshold: low-scoring matches are still returned", async () => {
    mockQuery.mockResolvedValue([
      {
        id: "a",
        score: 0.01,
        data: "",
        metadata: { candidateId: "a", source: "a.pdf", content: "a" },
      },
    ]);

    const results = await retrieve("query", { topK: 5 });

    expect(results).toEqual([
      { candidateId: "a", source: "a.pdf", content: "a", score: 0.01 },
    ]);
  });
});
