import type { ReactNode } from "react";
import { classNames } from "../../classnames/classNames";
import styles from "./Badge.module.css";

export interface BadgeProps {
  children: ReactNode;
  variant?: "neutral" | "error";
  className?: string | undefined;
}

/**
 * A small label, used for a cited candidate's name.
 *
 * @example
 * ```tsx
 * <Badge>Jane Doe</Badge>
 * ```
 */
export const Badge = ({ children, variant = "neutral", className = "" }: BadgeProps) => (
  <span className={classNames(styles.badge, styles[`badge--${variant}`], className)}>{children}</span>
);
