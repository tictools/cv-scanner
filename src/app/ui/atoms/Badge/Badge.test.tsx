import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders its children", () => {
    render(<Badge>Jane Doe</Badge>);

    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("applies the requested variant's class", () => {
    render(<Badge variant="error">Failed</Badge>);

    expect(screen.getByText("Failed").className).toContain("badge--error");
  });
});
