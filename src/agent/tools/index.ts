import type { CreateToolsOptions } from "../types/tools";
import { SCAN_CV_TOOL_NAME, createScanCVTool } from "./scan-cv";

export const createTools = ({ resolveCredentials }: CreateToolsOptions) => ({
  [SCAN_CV_TOOL_NAME]: createScanCVTool({ resolveCredentials }),
});
