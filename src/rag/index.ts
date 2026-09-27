import "dotenv/config";
import { readCvLocations } from "./dataset/paths";
import { requireUpstashCredentials } from "./env/upstash-credentials";
import { ingest } from "./ingestion/ingest";
import { createVectorIndex } from "./store/vector-index";

const credentials = requireUpstashCredentials();
const store = createVectorIndex(credentials);
const cvLocations = await readCvLocations();

const summary = await ingest({ store, cvLocations });

console.log(`Indexed ${summary.indexed.length} candidates`);

if (summary.failed.length > 0) {
  console.error(`Failed to index ${summary.failed.length} candidates:`);
  for (const { candidateId, reason } of summary.failed) {
    console.error(`  - ${candidateId}: ${reason}`);
  }
  process.exit(1);
}
