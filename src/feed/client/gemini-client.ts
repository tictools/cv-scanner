import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";

export interface GenerateJsonOptions {
  model: string;
  prompt: string;
}

export interface GenerateImageOptions {
  model: string;
  prompt: string;
}

/**
 * Thin wrapper over the Gemini SDK. Holds no CV domain logic so the provider
 * can be swapped without touching code outside `client/`.
 */
export class GeminiClient {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /** Calls a text model with JSON structured output; returns the parsed payload. */
  async generateJson({ model, prompt }: GenerateJsonOptions): Promise<unknown> {
    const generativeModel = this.genAI.getGenerativeModel({
      model,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await generativeModel.generateContent(prompt);

    return JSON.parse(result.response.text());
  }

  /** Calls an image model; returns the raw image bytes. */
  async generateImageBytes({
    model,
    prompt,
  }: GenerateImageOptions): Promise<Buffer> {
    const generativeModel = this.genAI.getGenerativeModel({ model });

    const result = await generativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // `responseModalities` is accepted by the REST API for image models but is
      // not yet typed in this SDK version's GenerationConfig.
      generationConfig: {
        responseModalities: ["IMAGE"],
      } as unknown as GenerationConfig,
    });

    const part = result.response.candidates?.[0]?.content.parts.find(
      (p) => "inlineData" in p && Boolean(p.inlineData?.data),
    );

    if (!part || !("inlineData" in part) || !part.inlineData?.data) {
      throw new Error("Gemini response contained no image data");
    }

    return Buffer.from(part.inlineData.data, "base64");
  }
}
