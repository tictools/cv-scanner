import type { KeyboardEvent } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import styles from "./Input.module.css";

export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: Maybe<string>;
}

/**
 * A single-line text input.
 *
 * @example
 * ```tsx
 * <Input value={question} onChange={setQuestion} placeholder="Ask a question..." />
 * ```
 */
export const Input = ({ value, onChange, onKeyDown, placeholder, disabled = false, className = "" }: InputProps) => (
  <input
    type="text"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    disabled={disabled}
    className={classNames(styles["input"], className)}
  />
);
