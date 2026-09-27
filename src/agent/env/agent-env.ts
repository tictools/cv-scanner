import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import type { ScannerAgent } from "../chat/scanner-agent";

export interface Env {
  OPENAI_API_KEY: string;
  UPSTASH_VECTOR_REST_URL: string;
  UPSTASH_VECTOR_REST_TOKEN: string;
  ScannerAgent: DurableObjectNamespace<ScannerAgent>;
}

export interface AgentUpstashCredentials {
  url: string;
  token: string;
}

export const requireOpenAiApiKey = (env: Pick<Env, "OPENAI_API_KEY">): string => {
  const value = env.OPENAI_API_KEY?.trim();

  if (!value) {
    throw new Error(
      "Missing required environment variable: OPENAI_API_KEY. Set it in a local .env file before running pnpm dev:agent.",
    );
  }

  return value;
};

export const upstashCredentialsFromEnv = (
  env: Pick<Env, "UPSTASH_VECTOR_REST_URL" | "UPSTASH_VECTOR_REST_TOKEN">,
): AgentUpstashCredentials => {
  return {
    url: env.UPSTASH_VECTOR_REST_URL,
    token: env.UPSTASH_VECTOR_REST_TOKEN,
  };
};
