import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders the given failure message", () => {
    render(<ErrorBanner message="The assistant cannot be reached." />);

    expect(screen.getByText("The assistant cannot be reached.")).toBeTruthy();
  });

  it("renders with an alert role so it is announced as a persistent failure", () => {
    render(<ErrorBanner message="The assistant cannot be reached." />);

    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
