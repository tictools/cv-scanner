import { type CreateScanCVToolOptions, createScanCVTool } from "./scan-cv";

export type CreateToolsOptions = CreateScanCVToolOptions;

export const createTools = ({ credentials }: CreateToolsOptions) => ({
  "scan-cv": createScanCVTool({ credentials }),
});
