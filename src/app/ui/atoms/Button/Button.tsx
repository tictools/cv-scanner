import type { ReactNode } from "react";
import { classNames } from "../../classnames/classNames";
import styles from "./Button.module.css";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string | undefined;
}

/**
 * A clickable button, the only atom that emits `<button>`.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={() => ask(question)}>Send</Button>
 * ```
 */
export const Button = ({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  className = "",
}: ButtonProps) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={classNames(styles.button, styles[`button--${variant}`], className)}
  >
    {children}
  </button>
);
