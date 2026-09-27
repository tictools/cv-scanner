import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with an accessible loading label", () => {
    render(<Spinner label="searching the CVs" />);

    expect(screen.getByRole("status", { name: "searching the CVs" })).toBeTruthy();
  });
});
