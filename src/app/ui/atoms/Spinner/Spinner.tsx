import { classNames } from "../../classnames/classNames";
import styles from "./Spinner.module.css";

export interface SpinnerProps {
  label: string;
  className?: string | undefined;
}

/**
 * A loading indicator with an accessible label.
 *
 * @example
 * ```tsx
 * <Spinner label="searching the CVs" />
 * ```
 */
export const Spinner = ({ label, className = "" }: SpinnerProps) => (
  <span role="status" aria-label={label} className={classNames(styles.spinner, className)} />
);
