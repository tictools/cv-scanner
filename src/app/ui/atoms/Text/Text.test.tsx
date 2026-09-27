import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "./Text";

describe("Text", () => {
  it("renders its children", () => {
    render(<Text>Hello there</Text>);

    expect(screen.getByText("Hello there")).toBeTruthy();
  });

  it("applies the requested variant's class", () => {
    render(<Text variant="muted">Hello there</Text>);

    expect(screen.getByText("Hello there").className).toContain("text--muted");
  });

  it("defaults to the normal variant", () => {
    render(<Text>Hello there</Text>);

    expect(screen.getByText("Hello there").className).toContain("text--normal");
  });
});
