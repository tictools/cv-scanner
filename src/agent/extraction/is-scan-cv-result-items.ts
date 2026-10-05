import type { ScanCVResultItem } from "../types/chunks";

export const isScanCVResultItems = (output: unknown): output is ScanCVResultItem[] => Array.isArray(output);
