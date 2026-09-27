import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("submits the typed question via the send control and clears the input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchBar onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText("Ask a question...") as HTMLInputElement;
    await user.type(input, "Who knows React?");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith("Who knows React?");
    expect(input.value).toBe("");
  });

  it("submits on Enter, exactly as the send control would", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchBar onSubmit={onSubmit} />);
    await user.type(screen.getByPlaceholderText("Ask a question..."), "Who knows React?{Enter}");

    expect(onSubmit).toHaveBeenCalledWith("Who knows React?");
  });

  it("does not submit an empty or whitespace-only question", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchBar onSubmit={onSubmit} />);
    await user.type(screen.getByPlaceholderText("Ask a question..."), "   {Enter}");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the input and send control while a turn is in progress", () => {
    render(<SearchBar onSubmit={vi.fn()} disabled />);

    expect(screen.getByPlaceholderText("Ask a question...").hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Send" }).hasAttribute("disabled")).toBe(true);
  });
});
