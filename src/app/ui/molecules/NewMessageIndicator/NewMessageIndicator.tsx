import { Button } from "../../atoms/Button/Button";
import styles from "./NewMessageIndicator.module.css";

export interface NewMessageIndicatorProps {
  onClick: () => void;
}

/**
 * A control, anchored bottom-right by its own CSS, flagging that an answer
 * landed below the fold. Visibility is the caller's choice (`RenderOrNull`).
 *
 * @example
 * ```tsx
 * <RenderOrNull shouldRender={hasNewMessage}>
 *   <NewMessageIndicator onClick={scrollToLatest} />
 * </RenderOrNull>
 * ```
 */
export const NewMessageIndicator = ({ onClick }: NewMessageIndicatorProps) => (
  <Button onClick={onClick} className={styles["newMessageIndicator"]}>
    New message <span aria-hidden="true">↓</span>
  </Button>
);
