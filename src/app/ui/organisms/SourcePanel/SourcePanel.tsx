import type { SourceReference } from "@agent/extraction/extract-sources";
import type { Maybe } from "@shared/ts/typeUtils/aliases";
import { Container } from "../../atoms/Container/Container";
import { Heading } from "../../atoms/Heading/Heading";
import { Text } from "../../atoms/Text/Text";
import { SourceEntry } from "../../molecules/SourceEntry/SourceEntry";
import styles from "./SourcePanel.module.css";

export interface SourcePanelProps {
  sources: Maybe<SourceReference[]>;
}

/**
 * The cited CVs of the most recent answered turn, one entry per row — the only
 * place a turn's sources are shown.
 *
 * @example
 * ```tsx
 * <SourcePanel sources={latestAnsweredSources(messages)} />
 * ```
 */
export const SourcePanel = ({ sources }: SourcePanelProps) => (
  <Container className={styles["sourcePanel"]}>
    <Heading level={2} className={styles["sourcePanel__title"]}>
      Cited CVs
    </Heading>
    {!sources || sources.length === 0 ? (
      <Text variant="muted">No CVs have been cited yet.</Text>
    ) : (
      <Container className={styles["sourceList"]}>
        {sources.map((source) => (
          <SourceEntry key={source.candidateId} source={source} />
        ))}
      </Container>
    )}
  </Container>
);
