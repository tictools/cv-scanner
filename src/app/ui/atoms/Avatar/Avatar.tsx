import { useState } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import styles from "./Avatar.module.css";

export interface AvatarProps {
  src: string;
  name: string;
  className?: Maybe<string>;
}

const INITIALS_LIMIT = 2;

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, INITIALS_LIMIT)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

/**
 * A round portrait of a person, falling back to their initials when the image
 * cannot be displayed, so a missing file never renders as a broken image.
 *
 * @example
 * ```tsx
 * <Avatar src={photoUrl(source.candidateId)} name={source.candidateName} />
 * ```
 */
export const Avatar = ({ src, name, className = "" }: AvatarProps) => {
  const [unavailable, setUnavailable] = useState(false);

  if (unavailable) {
    return (
      <span role="img" aria-label={name} className={classNames(styles["avatar"], styles["avatar--fallback"], className)}>
        {initialsOf(name)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className={classNames(styles["avatar"], className)}
      onError={() => setUnavailable(true)}
    />
  );
};
