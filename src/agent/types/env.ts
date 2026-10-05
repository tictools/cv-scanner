import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import type { ScannerAgent } from "../worker/scanner-agent";

export interface Env {
  OPENAI_API_KEY: string;
  UPSTASH_VECTOR_REST_URL: string;
  UPSTASH_VECTOR_REST_TOKEN: string;
  ScannerAgent: DurableObjectNamespace<ScannerAgent>;
}
