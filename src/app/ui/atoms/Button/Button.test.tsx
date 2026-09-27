import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Send</Button>);
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick} disabled>
        Send
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type button, so it never submits an enclosing form by accident", () => {
    render(<Button>Send</Button>);

    expect(screen.getByRole("button", { name: "Send" }).getAttribute("type")).toBe("button");
  });

  it("applies the requested type", () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole("button", { name: "Send" }).getAttribute("type")).toBe("submit");
  });

  it("applies a variant-specific class", () => {
    render(<Button variant="secondary">Send</Button>);

    expect(screen.getByRole("button", { name: "Send" }).className).toContain("button--secondary");
  });
});
