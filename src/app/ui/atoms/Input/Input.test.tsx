import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("renders the given value and placeholder", () => {
    render(<Input value="hello" onChange={() => {}} placeholder="Ask a question..." />);

    const input = screen.getByPlaceholderText("Ask a question...") as HTMLInputElement;

    expect(input.value).toBe("hello");
  });

  it("calls onChange with the new value as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Input value="" onChange={onChange} placeholder="Ask a question..." />);
    await user.type(screen.getByPlaceholderText("Ask a question..."), "hi");

    expect(onChange).toHaveBeenCalledWith("h");
    expect(onChange).toHaveBeenCalledWith("i");
  });

  it("calls onKeyDown for each keystroke", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();

    render(<Input value="" onChange={() => {}} onKeyDown={onKeyDown} placeholder="Ask a question..." />);
    await user.type(screen.getByPlaceholderText("Ask a question..."), "{Enter}");

    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onKeyDown.mock.calls[0]?.[0]?.key).toBe("Enter");
  });

  it("is disabled when requested", () => {
    render(<Input value="" onChange={() => {}} placeholder="Ask a question..." disabled />);

    expect(screen.getByPlaceholderText("Ask a question...").hasAttribute("disabled")).toBe(true);
  });
});
