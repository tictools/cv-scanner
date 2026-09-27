import type { ReactNode } from "react";
import { classNames } from "../../classnames/classNames";
import styles from "./Heading.module.css";

export interface HeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string | undefined;
}

/**
 * A section heading, h1 through h4.
 *
 * @example
 * ```tsx
 * <Heading level={2}>Cited CVs</Heading>
 * ```
 */
export const Heading = ({ children, level = 1, className = "" }: HeadingProps) => {
  const Tag = `h${level}` as const;

  return <Tag className={classNames(styles.heading, className)}>{children}</Tag>;
};
