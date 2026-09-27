import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./Heading";

describe("Heading", () => {
  it("renders an h1 by default", () => {
    render(<Heading>Title</Heading>);

    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeTruthy();
  });

  it("renders the requested heading level", () => {
    render(<Heading level={3}>Section</Heading>);

    expect(screen.getByRole("heading", { level: 3, name: "Section" })).toBeTruthy();
  });
});
