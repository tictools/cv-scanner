import { requireEnvVar } from "@shared/env/require-env-var";

export const requireGeminiApiKey = (env: NodeJS.ProcessEnv = process.env): string => {
  return requireEnvVar({ env, name: "GEMINI_API_KEY", command: "pnpm generate:cvs" });
};
