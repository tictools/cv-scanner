import { type CreateScanCVToolOptions, createScanCVTool } from "./scan-cv";

export type CreateToolsOptions = CreateScanCVToolOptions;

export const createTools = ({ resolveCredentials }: CreateToolsOptions) => ({
  "scan-cv": createScanCVTool({ resolveCredentials }),
});
