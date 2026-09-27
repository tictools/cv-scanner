import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Container } from "./Container";

describe("Container", () => {
  it("renders its children", () => {
    render(
      <Container>
        <span>child</span>
      </Container>,
    );

    expect(screen.getByText("child")).toBeTruthy();
  });

  it("merges a custom className with its own", () => {
    render(
      <Container className="my-class" data-testid="wrapper">
        content
      </Container>,
    );

    const wrapper = screen.getByTestId("wrapper");

    expect(wrapper.className).toContain("container");
    expect(wrapper.className).toContain("my-class");
  });
});
