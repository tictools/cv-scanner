import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const OPENAI_MODEL_ID = "gpt-5.4-mini-2026-03-17";

export interface LlmClientOptions {
  apiKey: string;
}

export const createLlmClient = ({ apiKey }: LlmClientOptions): LanguageModel => {
  const provider = createOpenAI({ apiKey });

  return provider(OPENAI_MODEL_ID);
};
