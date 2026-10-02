import { Fragment, type ReactNode } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import { parseMarkdown, type InlineNode, type MarkdownBlock } from "./parse-markdown";
import styles from "./Markdown.module.css";

export interface MarkdownProps {
  children: string;
  className?: Maybe<string>;
}

const inlineElement = (node: InlineNode, index: number): ReactNode => {
  const key = `${node.type}-${index}`;

  if (node.type === "strong") {
    return <strong key={key}>{node.value}</strong>;
  }

  if (node.type === "emphasis") {
    return <em key={key}>{node.value}</em>;
  }

  if (node.type === "code") {
    return (
      <code key={key} className={styles["markdown__code"]}>
        {node.value}
      </code>
    );
  }

  return <Fragment key={key}>{node.value}</Fragment>;
};

const blockElement = (block: MarkdownBlock, index: number): ReactNode => {
  const key = `${block.type}-${index}`;

  if (block.type === "paragraph") {
    return (
      <p key={key} className={styles["markdown__paragraph"]}>
        {block.content.map(inlineElement)}
      </p>
    );
  }

  const ListTag = block.ordered ? "ol" : "ul";

  return (
    <ListTag key={key} className={styles["markdown__list"]}>
      {block.items.map((item, itemIndex) => (
        <li key={`item-${itemIndex}`} className={styles["markdown__item"]}>
          {item.map(inlineElement)}
        </li>
      ))}
    </ListTag>
  );
};

/**
 * Renders the Markdown subset the agent's answers use — paragraphs, bulleted and
 * numbered lists, strong, emphasis, inline code — as elements. The text is parsed
 * into React nodes, never injected as HTML.
 *
 * @example
 * ```tsx
 * <Markdown>{part.text}</Markdown>
 * ```
 */
export const Markdown = ({ children, className = "" }: MarkdownProps) => (
  <div className={classNames(styles["markdown"], className)}>{parseMarkdown(children).map(blockElement)}</div>
);
