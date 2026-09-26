import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer";
import type { Cv } from "../cv/types";
import { slugify } from "../naming/slug";
import { CVS_DIR } from "../output/paths";
import { renderCvHtml, type TemplateName } from "../templates";

export interface RenderCvPdfParams {
  cv: Cv;
  outputDir?: string;
  template?: TemplateName;
  fileBaseName?: string;
}

/**
 * Renders a Cv to PDF via an HTML/CSS template. Puppeteer usage is kept as
 * thin glue; all layout lives in `templates/`.
 */
export const renderCvPdf = async ({
  cv,
  outputDir = CVS_DIR,
  template = "modern",
  fileBaseName = slugify(cv.name),
}: RenderCvPdfParams): Promise<string> => {
  const pdfPath = join(outputDir, `${fileBaseName}.pdf`);
  const photo = await readFile(cv.photoPath);
  const photoDataUri = `data:image/png;base64,${photo.toString("base64")}`;
  const html = renderCvHtml({ cv, template, photoDataUri });

  await mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  return pdfPath;
};
