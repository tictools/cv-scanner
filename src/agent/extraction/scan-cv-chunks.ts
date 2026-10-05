import { SCAN_CV_TOOL_NAME } from "../tools/scan-cv";
import type { RetrievedChunk } from "../types/chunks";
import type { ToolResultInput } from "../types/tools";
import { isScanCVResultItems } from "./is-scan-cv-result-items";

export const extractScanCVChunks = (toolResults: ToolResultInput[]): RetrievedChunk[] =>
  toolResults
    .filter((result) => result.toolName === SCAN_CV_TOOL_NAME)
    .flatMap((result) => (isScanCVResultItems(result.output) ? (result.output as RetrievedChunk[]) : []));
