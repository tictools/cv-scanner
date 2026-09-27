import { readFile } from "node:fs/promises";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

export interface ExtractTextOptions {
  pdfPath: string;
}

export const extractText = async ({ pdfPath }: ExtractTextOptions): Promise<string> => {
  try {
    const bytes = await readFile(pdfPath);
    const document = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractPdfText(document, { mergePages: true });

    return text;
  } catch (cause) {
    throw new Error(`Failed to extract text from PDF at ${pdfPath}`, { cause });
  }
};
