import type { ComponentPropsWithoutRef } from "react";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { classNames } from "../../classnames/classNames";
import styles from "./Container.module.css";

export interface ContainerProps extends ComponentPropsWithoutRef<"div"> {
  className?: Maybe<string>;
}

/**
 * The layout primitive every molecule and organism wraps in, so no raw DOM
 * element is needed above the atom layer.
 *
 * @example
 * ```tsx
 * <Container className={styles["searchBar"]}>
 *   <Input ... />
 *   <Button ... />
 * </Container>
 * ```
 */
export const Container = ({ className = "", ...rest }: ContainerProps) => (
  <div className={classNames(styles["container"], className)} {...rest} />
);
