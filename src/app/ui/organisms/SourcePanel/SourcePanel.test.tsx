import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourcePanel } from "./SourcePanel";
import styles from "./SourcePanel.module.css";

describe("SourcePanel", () => {
  it("lists the given cited CVs, one entry per candidate, portrait and name together", () => {
    const { container } = render(
      <SourcePanel
        sources={[
          { candidateId: "jane-doe", candidateName: "Jane Doe", source: "data/cvs/jane-doe.pdf", score: 0.8 },
          { candidateId: "john-roe", candidateName: "John Roe", source: "data/cvs/john-roe.pdf", score: 0.5 },
        ]}
      />,
    );

    const EXPECTED_ENTRIES = 2;

    expect(container.querySelectorAll(`.${styles["sourceList"]} > *`).length).toBe(EXPECTED_ENTRIES);
    expect(screen.getByRole("link", { name: "Jane Doe" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Jane Doe" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "John Roe" })).toBeTruthy();
  });

  it("states that no CVs have been cited yet when the list is empty", () => {
    render(<SourcePanel sources={[]} />);

    expect(screen.getByText("No CVs have been cited yet.")).toBeTruthy();
  });
});
