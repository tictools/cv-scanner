import {
  requireUpstashCredentials as requireSharedUpstashCredentials,
  type UpstashCredentials,
} from "@shared/env/upstash-credentials";
import type { Maybe } from "@shared/ts/typeUtils/aliases";

export type { UpstashCredentials };

export const requireUpstashCredentials = (
  env: Record<string, Maybe<string>> = process.env,
): UpstashCredentials => {
  return requireSharedUpstashCredentials({ env, command: "pnpm ingest:cvs" });
};
