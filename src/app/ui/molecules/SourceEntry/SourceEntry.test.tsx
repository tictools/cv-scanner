import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceEntry } from "./SourceEntry";

const source = {
  candidateId: "jane-doe",
  candidateName: "Jane Doe",
  source: "data/cvs/jane-doe.pdf",
  score: 0.8,
};

describe("SourceEntry", () => {
  it("shows the candidate's name as a link to their PDF in a new browsing context", () => {
    render(<SourceEntry source={source} />);

    const link = screen.getByRole("link", { name: "Jane Doe" });

    expect(link.getAttribute("href")).toBe("/cvs/jane-doe.pdf");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("shows the candidate's CV portrait beside the name", () => {
    render(<SourceEntry source={source} />);

    const portrait = screen.getByRole("img", { name: "Jane Doe" });

    expect(portrait.getAttribute("src")).toBe("/photos/jane-doe.png");
  });
});
