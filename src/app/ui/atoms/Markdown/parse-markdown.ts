import type { Maybe } from "@shared/ts/typeUtils/aliases";

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "emphasis"; value: string }
  | { type: "code"; value: string };

export type MarkdownBlock =
  | { type: "paragraph"; content: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] };

type RawBlock = { kind: "paragraph"; lines: string[] } | { kind: "list"; ordered: boolean; items: string[] };

const BULLET_PATTERN = /^\s*[-*]\s+(.*)$/;
const ORDERED_PATTERN = /^\s*\d+\.\s+(.*)$/;
const INLINE_PATTERN = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`\n]+)`/g;

const listItemOf = (line: string): Maybe<{ ordered: boolean; text: string }> => {
  const bullet = BULLET_PATTERN.exec(line);

  if (bullet) {
    return { ordered: false, text: bullet[1] ?? "" };
  }

  const ordered = ORDERED_PATTERN.exec(line);

  return ordered ? { ordered: true, text: ordered[1] ?? "" } : undefined;
};

const inlineNodeOf = (match: RegExpExecArray): InlineNode => {
  const [, strong, emphasis, code] = match;

  if (strong !== undefined) {
    return { type: "strong", value: strong };
  }

  if (emphasis !== undefined) {
    return { type: "emphasis", value: emphasis };
  }

  return { type: "code", value: code ?? "" };
};

/**
 * Splits one line of text into its inline spans. Anything the pattern does not
 * recognize — including markup a streamed chunk cut in half — stays literal text.
 */
const parseInline = (text: string): InlineNode[] => {
  const nodes: InlineNode[] = [];
  let consumed = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > consumed) {
      nodes.push({ type: "text", value: text.slice(consumed, match.index) });
    }

    nodes.push(inlineNodeOf(match));

    consumed = match.index + match[0].length;
  }

  if (consumed < text.length) {
    nodes.push({ type: "text", value: text.slice(consumed) });
  }

  return nodes;
};

/**
 * Groups lines into blocks: a blank line closes whatever is open, consecutive
 * list items of the same kind form one list, and everything else accumulates
 * into the paragraph being read.
 */
const groupLines = (lines: string[]): RawBlock[] => {
  const blocks: RawBlock[] = [];
  let open: Maybe<RawBlock>;

  for (const line of lines) {
    const item = listItemOf(line);

    if (!line.trim()) {
      open = undefined;
      continue;
    }

    if (item) {
      if (open?.kind === "list" && open.ordered === item.ordered) {
        open.items.push(item.text);
        continue;
      }

      open = { kind: "list", ordered: item.ordered, items: [item.text] };
      blocks.push(open);
      continue;
    }

    if (open?.kind === "paragraph") {
      open.lines.push(line.trim());
      continue;
    }

    open = { kind: "paragraph", lines: [line.trim()] };
    blocks.push(open);
  }

  return blocks;
};

/**
 * Parses the Markdown subset the agent's answers are written in — paragraphs,
 * bulleted and numbered lists, and inline strong/emphasis/code — into blocks a
 * component can render as elements.
 */
export const parseMarkdown = (source: string): MarkdownBlock[] =>
  groupLines(source.split("\n")).map((block) =>
    block.kind === "list"
      ? { type: "list", ordered: block.ordered, items: block.items.map(parseInline) }
      : { type: "paragraph", content: parseInline(block.lines.join(" ")) },
  );
