import { Badge } from "../../atoms/Badge/Badge";
import { Container } from "../../atoms/Container/Container";
import { Text } from "../../atoms/Text/Text";
import styles from "./ErrorBanner.module.css";

export interface ErrorBannerProps {
  message: string;
}

/**
 * A persistent, visible failure message — never a toast, since a connection
 * or turn failure is not a transient event.
 *
 * @example
 * ```tsx
 * <ErrorBanner message="The assistant cannot be reached." />
 * ```
 */
export const ErrorBanner = ({ message }: ErrorBannerProps) => (
  <Container className={styles.errorBanner} role="alert">
    <Badge variant="error">Error</Badge>
    <Text>{message}</Text>
  </Container>
);
