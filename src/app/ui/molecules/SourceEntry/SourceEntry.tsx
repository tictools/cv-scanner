import type { SourceReference } from "@agent/extraction/extract-sources";
import { Avatar } from "../../atoms/Avatar/Avatar";
import { Badge } from "../../atoms/Badge/Badge";
import { Container } from "../../atoms/Container/Container";
import { Link } from "../../atoms/Link/Link";
import { pdfUrl } from "../../../sources/pdf-url";
import { photoUrl } from "../../../sources/photo-url";
import styles from "./SourceEntry.module.css";

export interface SourceEntryProps {
  source: SourceReference;
}

/**
 * One cited candidate: their CV portrait beside their name, the name opening
 * their PDF.
 *
 * @example
 * ```tsx
 * <SourceEntry source={source} />
 * ```
 */
export const SourceEntry = ({ source }: SourceEntryProps) => (
  <Container className={styles.sourceEntry}>
    <Avatar src={photoUrl(source.candidateId)} name={source.candidateName} />
    <Link href={pdfUrl(source.source)} className={styles.sourceEntry__link}>
      <Badge>{source.candidateName}</Badge>
    </Link>
  </Container>
);
