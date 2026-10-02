import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import { requireEnvVar } from "@shared/env/require-env-var";
import {
  requireUpstashCredentials as requireSharedUpstashCredentials,
  type UpstashCredentials,
} from "@shared/env/upstash-credentials";
import type { ScannerAgent } from "../chat/scanner-agent";

export interface Env {
  OPENAI_API_KEY: string;
  UPSTASH_VECTOR_REST_URL: string;
  UPSTASH_VECTOR_REST_TOKEN: string;
  ScannerAgent: DurableObjectNamespace<ScannerAgent>;
}

export const requireOpenAiApiKey = (env: Pick<Env, "OPENAI_API_KEY">): string => {
  return requireEnvVar({ env, name: "OPENAI_API_KEY", command: "pnpm dev:agent" });
};

export const requireUpstashCredentials = (
  env: Pick<Env, "UPSTASH_VECTOR_REST_URL" | "UPSTASH_VECTOR_REST_TOKEN">,
): UpstashCredentials => {
  return requireSharedUpstashCredentials({ env, command: "pnpm dev:agent" });
};
