import { requireEnvVar, type EnvSource } from "./require-env-var";

export interface UpstashCredentials {
  url: string;
  token: string;
}

export type UpstashEnvVar = "UPSTASH_VECTOR_REST_URL" | "UPSTASH_VECTOR_REST_TOKEN";

export interface RequireUpstashCredentialsOptions {
  env: EnvSource<UpstashEnvVar>;
  command: string;
}

export const requireUpstashCredentials = ({
  env,
  command,
}: RequireUpstashCredentialsOptions): UpstashCredentials => {
  return {
    url: requireEnvVar({ env, name: "UPSTASH_VECTOR_REST_URL", command }),
    token: requireEnvVar({ env, name: "UPSTASH_VECTOR_REST_TOKEN", command }),
  };
};
