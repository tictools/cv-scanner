import type { ReactNode } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import styles from "./Text.module.css";

export interface TextProps {
  children: ReactNode;
  variant?: "normal" | "small" | "muted" | "mono";
  className?: Maybe<string>;
}

/**
 * A paragraph of body text.
 *
 * @example
 * ```tsx
 * <Text variant="muted">No CVs have been cited yet.</Text>
 * ```
 */
export const Text = ({ children, variant = "normal", className = "" }: TextProps) => (
  <p className={classNames(styles["text"], styles[`text--${variant}`], className)}>{children}</p>
);
