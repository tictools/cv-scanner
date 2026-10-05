import type { UpstashCredentials } from "@shared/env/upstash-credentials";
import type { Maybe, PromiseOr } from "@shared/ts/typeUtils/aliases";
import type { z } from "zod";
import type { ScanCVInputSchema } from "../tools/scan-cv";

export interface ToolResultInput {
  toolName: string;
  output: unknown;
}

export interface CreateScanCVToolOptions {
  // Resolved inside `execute`, so missing credentials surface as a tool error rather than an
  // exception thrown before the chat turn starts.
  resolveCredentials?: Maybe<() => PromiseOr<UpstashCredentials>>;
}

export type CreateToolsOptions = CreateScanCVToolOptions;

export type ScanCVInput = z.infer<typeof ScanCVInputSchema>;
