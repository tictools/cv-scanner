import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewMessageIndicator } from "./NewMessageIndicator";

describe("NewMessageIndicator", () => {
  it("renders a button whose accessible name is 'New message'", () => {
    render(<NewMessageIndicator onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "New message" })).toBeTruthy();
  });

  it("hides the arrow glyph from assistive technology", () => {
    render(<NewMessageIndicator onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "New message" });

    expect(button.textContent).toContain("↓");
    expect(button.querySelector("[aria-hidden='true']")?.textContent).toBe("↓");
  });

  it("calls onClick when activated by click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<NewMessageIndicator onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "New message" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("calls onClick when activated by keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<NewMessageIndicator onClick={onClick} />);
    await user.tab();
    await user.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledOnce();
  });
});
