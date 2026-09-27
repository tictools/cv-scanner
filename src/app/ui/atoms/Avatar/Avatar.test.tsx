import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("shows the portrait, named after the person it depicts", () => {
    render(<Avatar src="/photos/jane-doe.png" name="Jane Doe" />);

    const portrait = screen.getByRole("img", { name: "Jane Doe" });

    expect(portrait.getAttribute("src")).toBe("/photos/jane-doe.png");
  });

  it("falls back to the person's initials when the portrait fails to load", () => {
    render(<Avatar src="/photos/jane-doe.png" name="Jane Doe" />);

    fireEvent.error(screen.getByRole("img", { name: "Jane Doe" }));

    expect(screen.getByRole("img", { name: "Jane Doe" }).tagName).not.toBe("IMG");
    expect(screen.getByText("JD")).toBeTruthy();
  });
});
