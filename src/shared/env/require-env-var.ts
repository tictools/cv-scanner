export type EnvSource<Name extends string> = Readonly<Partial<Record<Name, string | undefined>>>;

export interface RequireEnvVarOptions<Name extends string> {
  env: EnvSource<Name>;
  name: Name;
  command: string;
}

export const requireEnvVar = <Name extends string>({
  env,
  name,
  command,
}: RequireEnvVarOptions<Name>): string => {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in a local .env file before running ${command}.`,
    );
  }

  return value;
};
