import { readFile } from "node:fs/promises";

export const DATA_DIR = "data";
export const CVS_DIR = `${DATA_DIR}/cvs`;
export const MANIFEST_PATH = `${DATA_DIR}/manifest.json`;

export interface CvLocation {
  candidateId: string;
  pdfPath: string;
}

export const readCvLocations = async (
  manifestPath: string = MANIFEST_PATH,
): Promise<CvLocation[]> => {
  const raw = await readFile(manifestPath, "utf-8");
  const entries: { candidateId: string; pdfPath: string }[] = JSON.parse(raw);

  return entries.map(({ candidateId, pdfPath }) => ({ candidateId, pdfPath }));
};
