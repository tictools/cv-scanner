import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Cv } from "../cv/types";
import { renderCvPdf } from "./pdf-renderer";

const { mockPdf, mockSetContent, mockNewPage, mockClose, mockLaunch } = vi.hoisted(() => ({
  mockPdf: vi.fn(),
  mockSetContent: vi.fn(),
  mockNewPage: vi.fn(),
  mockClose: vi.fn(),
  mockLaunch: vi.fn(),
}));

vi.mock("puppeteer", () => ({
  default: { launch: mockLaunch },
}));

const PHOTO_BYTES = Buffer.from("fake-photo-bytes");

let workDir: string;
let cv: Cv;

describe("renderCvPdf", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockLaunch.mockResolvedValue({ newPage: mockNewPage, close: mockClose });
    mockNewPage.mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf });

    workDir = await mkdtemp(join(tmpdir(), "cv-render-"));
    const photoPath = join(workDir, "jane-doe.png");
    await writeFile(photoPath, PHOTO_BYTES);

    cv = {
      name: "Jane Doe",
      contact: { email: "jane.doe@example.com", phone: "+34 600 123 456", location: "Barcelona" },
      photoPath,
      summary: "Backend engineer.",
      experience: [
        {
          title: "Backend Engineer",
          company: "Acme Corp",
          startDate: "2021-03",
          endDate: null,
          description: "Owns the payments API.",
        },
      ],
      education: [{ degree: "BSc CS", institution: "UB", year: "2017" }],
      skills: ["TypeScript"],
    };
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it("writes the PDF to {outputDir}/{first-last-name}.pdf and returns the path", async () => {
    const pdfPath = await renderCvPdf({ cv, outputDir: workDir });

    expect(pdfPath).toBe(join(workDir, "jane-doe.pdf"));
    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({ path: join(workDir, "jane-doe.pdf"), format: "A4" }),
    );
  });

  it("embeds the photo as a data URI in the rendered HTML", async () => {
    await renderCvPdf({ cv, outputDir: workDir });

    const html = mockSetContent.mock.calls[0]![0] as string;
    expect(html).toContain(`data:image/png;base64,${PHOTO_BYTES.toString("base64")}`);
    expect(html).toContain("Jane Doe");
  });

  it("uses the requested template", async () => {
    await renderCvPdf({ cv, outputDir: workDir, template: "classic" });

    const html = mockSetContent.mock.calls[0]![0] as string;
    expect(html).toContain("Professional Experience");
  });

  it("supports an explicit file base name", async () => {
    const pdfPath = await renderCvPdf({ cv, outputDir: workDir, fileBaseName: "candidate-07" });

    expect(pdfPath).toBe(join(workDir, "candidate-07.pdf"));
  });

  it("closes the browser when rendering fails", async () => {
    mockPdf.mockRejectedValue(new Error("puppeteer crashed"));

    await expect(renderCvPdf({ cv, outputDir: workDir })).rejects.toThrow("puppeteer crashed");
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
