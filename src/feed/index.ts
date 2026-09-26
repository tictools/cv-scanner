import "dotenv/config";
import { GeminiClient } from "./client/gemini-client";
import { requireGeminiApiKey } from "./env/gemini-api-key";
import { DATA_DIR } from "./output/paths";
import { feed } from "./pipeline/feed";

const apiKey = requireGeminiApiKey();
const client = new GeminiClient(apiKey);

const entries = await feed({ client, dataDir: DATA_DIR });
console.log(`Generated ${entries.length} CVs into ${DATA_DIR}/cvs`);
