export const requireGeminiApiKey = (env: NodeJS.ProcessEnv = process.env): string => {
  const apiKey = env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing required environment variable: GEMINI_API_KEY. " +
        "Copy your Google AI Studio key into a local .env file (GEMINI_API_KEY=...) before running pnpm generate:cvs.",
    );
  }
  return apiKey;
};
