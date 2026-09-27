import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";

describe("Markdown", () => {
  it("renders a bulleted answer as a list, one item per candidate", () => {
    const { container } = render(<Markdown>{"- Stefan Conroy\n- Jane Doe"}</Markdown>);

    expect(container.querySelectorAll("ul li").length).toBe(2);
    expect(screen.getByText("Stefan Conroy")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("renders a numbered answer as an ordered list", () => {
    const { container } = render(<Markdown>{"1. Stefan Conroy\n2. Jane Doe"}</Markdown>);

    expect(container.querySelectorAll("ol li").length).toBe(2);
  });

  it("emphasises strong, italic and code spans without showing their markup characters", () => {
    const { container } = render(
      <Markdown>{"- **Stefan Conroy** — *Senior Full-stack Developer*; uses `Node.js`"}</Markdown>,
    );

    expect(container.querySelector("strong")?.textContent).toBe("Stefan Conroy");
    expect(container.querySelector("em")?.textContent).toBe("Senior Full-stack Developer");
    expect(container.querySelector("code")?.textContent).toBe("Node.js");
    expect(container.textContent).not.toContain("**");
  });

  it("renders each paragraph of prose as its own paragraph", () => {
    const { container } = render(<Markdown>{"First answer.\n\nSecond thought."}</Markdown>);

    expect(container.querySelectorAll("p").length).toBe(2);
  });

  it("keeps markup a streamed chunk cut in half readable as written", () => {
    const { container } = render(<Markdown>{"Stefan Conroy is a **Senior"}</Markdown>);

    expect(container.textContent).toBe("Stefan Conroy is a **Senior");
  });

  it("renders nothing for empty text", () => {
    const { container } = render(<Markdown>{""}</Markdown>);

    expect(container.textContent).toBe("");
  });
});
