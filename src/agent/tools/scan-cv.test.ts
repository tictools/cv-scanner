import { describe, expect, it, vi } from "vitest";
import { DEFAULT_TOP_K, MAX_TOP_K, ScanCVInputSchema, createScanCVTool } from "./scan-cv";

const { mockRetrieve } = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
}));

vi.mock("@rag/retrieval/retrieve", () => ({
  retrieve: mockRetrieve,
}));

const TOOL_EXECUTION_OPTIONS = { toolCallId: "call-1", messages: [], context: {} };

describe("ScanCVInputSchema", () => {
  it("accepts a query with topK within range", () => {
    expect(ScanCVInputSchema.safeParse({ query: "backend engineer", topK: 3 }).success).toBe(
      true,
    );
  });

  it("accepts a query with topK omitted", () => {
    expect(ScanCVInputSchema.safeParse({ query: "backend engineer" }).success).toBe(true);
  });

  it("rejects a topK above the maximum", () => {
    const result = ScanCVInputSchema.safeParse({ query: "backend engineer", topK: MAX_TOP_K + 1 });

    expect(result.success).toBe(false);
  });

  it("rejects a non-integer topK", () => {
    const result = ScanCVInputSchema.safeParse({ query: "backend engineer", topK: 2.5 });

    expect(result.success).toBe(false);
  });
});

describe("createScanCVTool", () => {
  it("maps retrieve results to candidateId/candidateName/source/content/score", async () => {
    mockRetrieve.mockResolvedValue([
      {
        candidateId: "jane-doe",
        candidateName: "Jane Doe",
        source: "data/cvs/jane-doe.pdf",
        content: "Jane Doe CV text",
        score: 0.8,
      },
    ]);
    const scanCVTool = createScanCVTool({});

    const result = await scanCVTool.execute!(
      { query: "backend engineer", topK: 3 },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(result).toEqual([
      {
        candidateId: "jane-doe",
        candidateName: "Jane Doe",
        source: "data/cvs/jane-doe.pdf",
        content: "Jane Doe CV text",
        score: 0.8,
      },
    ]);
  });

  it("applies the default topK when omitted", async () => {
    mockRetrieve.mockResolvedValue([]);
    const scanCVTool = createScanCVTool({});

    await scanCVTool.execute!({ query: "backend engineer" }, TOOL_EXECUTION_OPTIONS);

    expect(mockRetrieve).toHaveBeenCalledWith("backend engineer", {
      topK: DEFAULT_TOP_K,
      credentials: undefined,
    });
  });

  it("resolves credentials when executed and passes them through to retrieve", async () => {
    mockRetrieve.mockResolvedValue([]);
    const credentials = { url: "https://example.upstash.io", token: "token" };
    const resolveCredentials = vi.fn(() => credentials);
    const scanCVTool = createScanCVTool({ resolveCredentials });

    expect(resolveCredentials).not.toHaveBeenCalled();

    await scanCVTool.execute!({ query: "backend engineer" }, TOOL_EXECUTION_OPTIONS);

    expect(mockRetrieve).toHaveBeenCalledWith("backend engineer", {
      topK: DEFAULT_TOP_K,
      credentials,
    });
  });

  it("returns a throwing credentials resolver as an { error } result instead of rethrowing", async () => {
    mockRetrieve.mockReset();
    const scanCVTool = createScanCVTool({
      resolveCredentials: () => {
        throw new Error("Missing required environment variable: UPSTASH_VECTOR_REST_URL.");
      },
    });

    const result = await scanCVTool.execute!({ query: "backend engineer" }, TOOL_EXECUTION_OPTIONS);

    expect(result).toEqual({ error: "Missing required environment variable: UPSTASH_VECTOR_REST_URL." });
    expect(mockRetrieve).not.toHaveBeenCalled();
  });

  it("returns an empty result set rather than an error when the index has no match", async () => {
    mockRetrieve.mockResolvedValue([]);
    const scanCVTool = createScanCVTool({});

    const result = await scanCVTool.execute!(
      { query: "COBOL" },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(result).toEqual([]);
  });

  it("returns a throwing retrieve as an { error } result instead of rethrowing", async () => {
    mockRetrieve.mockRejectedValue(new Error("vector store unreachable"));
    const scanCVTool = createScanCVTool({});

    const result = await scanCVTool.execute!(
      { query: "backend engineer" },
      TOOL_EXECUTION_OPTIONS,
    );

    expect(result).toEqual({ error: "vector store unreachable" });
  });
});
