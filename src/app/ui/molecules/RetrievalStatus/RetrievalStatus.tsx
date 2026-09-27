import { getToolPartState } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { Container } from "../../atoms/Container/Container";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { Text } from "../../atoms/Text/Text";
import styles from "./RetrievalStatus.module.css";

const LABEL = "searching the CVs";
const PENDING_STATES = new Set(["loading", "streaming"]);

export interface RetrievalStatusProps {
  part: UIMessage["parts"][number];
}

/**
 * Shows that the CV collection is being searched, for as long as the
 * retrieval tool call it wraps has no result yet.
 *
 * @example
 * ```tsx
 * <RetrievalStatus part={toolPart} />
 * ```
 */
export const RetrievalStatus = ({ part }: RetrievalStatusProps) => {
  if (!PENDING_STATES.has(getToolPartState(part))) {
    return null;
  }

  return (
    <Container className={styles.retrievalStatus}>
      <Spinner label={LABEL} />
      <Text variant="muted">{LABEL}</Text>
    </Container>
  );
};
