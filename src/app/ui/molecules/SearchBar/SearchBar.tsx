import { useState } from "react";
import { Button } from "../../atoms/Button/Button";
import { Container } from "../../atoms/Container/Container";
import { Input } from "../../atoms/Input/Input";
import styles from "./SearchBar.module.css";

export interface SearchBarProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}

/**
 * The question input: submits on the send control and on Enter, and never
 * submits an empty or whitespace-only question.
 *
 * @example
 * ```tsx
 * <SearchBar onSubmit={ask} disabled={state === "streaming"} />
 * ```
 */
export const SearchBar = ({ onSubmit, disabled = false }: SearchBarProps) => {
  const [question, setQuestion] = useState("");

  const submit = () => {
    const trimmed = question.trim();

    if (trimmed.length === 0) {
      return;
    }

    onSubmit(trimmed);
    setQuestion("");
  };

  return (
    <Container className={styles["searchBar"]}>
      <Input
        value={question}
        onChange={setQuestion}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            submit();
          }
        }}
        placeholder="Ask a question..."
        disabled={disabled}
      />
      <Button onClick={submit} disabled={disabled}>
        Send
      </Button>
    </Container>
  );
};
