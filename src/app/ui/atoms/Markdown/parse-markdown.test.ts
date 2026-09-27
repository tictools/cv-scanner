import { describe, expect, it } from "vitest";
import { parseMarkdown } from "./parse-markdown";

describe("parseMarkdown", () => {
  it("reads a single line as one paragraph of plain text", () => {
    expect(parseMarkdown("Jane Doe knows React.")).toEqual([
      { type: "paragraph", content: [{ type: "text", value: "Jane Doe knows React." }] },
    ]);
  });

  it("splits paragraphs on a blank line and joins the lines within one", () => {
    const blocks = parseMarkdown("First line\nsame paragraph\n\nSecond paragraph");

    expect(blocks).toEqual([
      { type: "paragraph", content: [{ type: "text", value: "First line same paragraph" }] },
      { type: "paragraph", content: [{ type: "text", value: "Second paragraph" }] },
    ]);
  });

  it("reads consecutive dash or asterisk lines as one bulleted list", () => {
    const blocks = parseMarkdown("- Stefan Conroy\n* Jane Doe");

    expect(blocks).toEqual([
      {
        type: "list",
        ordered: false,
        items: [[{ type: "text", value: "Stefan Conroy" }], [{ type: "text", value: "Jane Doe" }]],
      },
    ]);
  });

  it("reads consecutive numbered lines as one ordered list", () => {
    const blocks = parseMarkdown("1. Stefan Conroy\n2. Jane Doe");

    expect(blocks).toEqual([
      {
        type: "list",
        ordered: true,
        items: [[{ type: "text", value: "Stefan Conroy" }], [{ type: "text", value: "Jane Doe" }]],
      },
    ]);
  });

  it("separates a list from the paragraph preceding it without a blank line", () => {
    const blocks = parseMarkdown("Three candidates match:\n- Stefan Conroy");

    expect(blocks).toEqual([
      { type: "paragraph", content: [{ type: "text", value: "Three candidates match:" }] },
      { type: "list", ordered: false, items: [[{ type: "text", value: "Stefan Conroy" }]] },
    ]);
  });

  it("reads strong, emphasis and code spans inside an item, keeping the text around them", () => {
    const blocks = parseMarkdown("- **Stefan Conroy** — *Senior Full-stack Developer*; uses `Node.js`");

    expect(blocks).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          [
            { type: "strong", value: "Stefan Conroy" },
            { type: "text", value: " — " },
            { type: "emphasis", value: "Senior Full-stack Developer" },
            { type: "text", value: "; uses " },
            { type: "code", value: "Node.js" },
          ],
        ],
      },
    ]);
  });

  it("leaves markup that a streamed chunk cut in half as literal text", () => {
    expect(parseMarkdown("Stefan Conroy is a **Senior")).toEqual([
      { type: "paragraph", content: [{ type: "text", value: "Stefan Conroy is a **Senior" }] },
    ]);
  });

  it("returns no blocks for empty or whitespace-only text", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });
});
