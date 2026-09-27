export interface UpstashCredentials {
  url: string;
  token: string;
}

const requireVar = (env: Record<string, string | undefined>, name: string): string => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in a local .env file before running pnpm ingest:cvs.`,
    );
  }

  return value;
};

export const requireUpstashCredentials = (
  env: Record<string, string | undefined> = process.env,
): UpstashCredentials => {
  return {
    url: requireVar(env, "UPSTASH_VECTOR_REST_URL"),
    token: requireVar(env, "UPSTASH_VECTOR_REST_TOKEN"),
  };
};
