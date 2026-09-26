import { GoogleGenerativeAI } from "@google/generative-ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiClient } from "./gemini-client";

const { mockGenerateContent, mockGetGenerativeModel } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockGetGenerativeModel: vi.fn(),
}));

vi.mock("@google/generative-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@google/generative-ai")>();

  return {
    ...actual,
    GoogleGenerativeAI: vi.fn(function (this: unknown) {
      return { getGenerativeModel: mockGetGenerativeModel };
    }),
  };
});

const PNG_BYTES = Buffer.from("fake-png-bytes");
const PNG_BASE64 = PNG_BYTES.toString("base64");

describe("GeminiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGenerativeModel.mockReturnValue({ generateContent: mockGenerateContent });
  });

  it("passes the API key to the SDK", () => {
    new GeminiClient("test-key");

    expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-key");
  });

  describe("generateJson", () => {
    it("returns the parsed structured output from the text response", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"summary":"hello","n":1}' },
      });
      const client = new GeminiClient("test-key");

      const result = await client.generateJson({ model: "text-model", prompt: "give json" });

      expect(result).toEqual({ summary: "hello", n: 1 });
    });

    it("requests JSON structured output from the SDK", async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => "{}" } });
      const client = new GeminiClient("test-key");

      await client.generateJson({ model: "text-model", prompt: "give json" });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: "text-model",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });
      expect(mockGenerateContent).toHaveBeenCalledWith("give json");
    });

    it("propagates API errors", async () => {
      mockGenerateContent.mockRejectedValue(new Error("429 rate limit exceeded"));
      const client = new GeminiClient("test-key");

      await expect(client.generateJson({ model: "text-model", prompt: "x" })).rejects.toThrow(
        "429 rate limit exceeded",
      );
    });

    it("throws when the response text is not valid JSON", async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => "not json{" } });
      const client = new GeminiClient("test-key");

      await expect(client.generateJson({ model: "text-model", prompt: "x" })).rejects.toThrow();
    });
  });

  describe("generateImageBytes", () => {
    const imageResponse = {
      response: {
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: "image/png", data: PNG_BASE64 } }],
            },
          },
        ],
      },
    };

    it("returns the decoded image bytes", async () => {
      mockGenerateContent.mockResolvedValue(imageResponse);
      const client = new GeminiClient("test-key");

      const result = await client.generateImageBytes({ model: "image-model", prompt: "portrait" });

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result).toEqual(PNG_BYTES);
    });

    it("asks the SDK for an image response modality", async () => {
      mockGenerateContent.mockResolvedValue(imageResponse);
      const client = new GeminiClient("test-key");

      await client.generateImageBytes({ model: "image-model", prompt: "portrait" });

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: "image-model" }),
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          generationConfig: expect.objectContaining({ responseModalities: ["IMAGE"] }),
        }),
      );
    });

    it("propagates API errors", async () => {
      mockGenerateContent.mockRejectedValue(new Error("503 service unavailable"));
      const client = new GeminiClient("test-key");

      await expect(
        client.generateImageBytes({ model: "image-model", prompt: "x" }),
      ).rejects.toThrow("503 service unavailable");
    });

    it("throws when the response contains no image data", async () => {
      mockGenerateContent.mockResolvedValue({
        response: { candidates: [{ content: { parts: [{ text: "no image" }] } }] },
      });
      const client = new GeminiClient("test-key");

      await expect(
        client.generateImageBytes({ model: "image-model", prompt: "x" }),
      ).rejects.toThrow(/image/i);
    });
  });
});
