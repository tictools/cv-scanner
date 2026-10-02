import type { ReactNode } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import styles from "./Link.module.css";

export interface LinkProps {
  href: string;
  children: ReactNode;
  className?: Maybe<string>;
}

/**
 * A link that opens its target in a new browsing context, e.g. a cited CV's PDF.
 *
 * @example
 * ```tsx
 * <Link href={pdfUrl(source.source)}>{source.candidateName}</Link>
 * ```
 */
export const Link = ({ href, children, className = "" }: LinkProps) => (
  <a href={href} target="_blank" rel="noreferrer" className={classNames(styles["link"], className)}>
    {children}
  </a>
);
