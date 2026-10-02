import {
  requireUpstashCredentials as requireSharedUpstashCredentials,
  type UpstashCredentials,
} from "@shared/env/upstash-credentials";

export type { UpstashCredentials };

export const requireUpstashCredentials = (
  env: Record<string, string | undefined> = process.env,
): UpstashCredentials => {
  return requireSharedUpstashCredentials({ env, command: "pnpm ingest:cvs" });
};
