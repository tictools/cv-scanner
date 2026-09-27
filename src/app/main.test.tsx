import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks/useScannerChat", () => ({
  useScannerChat: () => ({ messages: [], ask: vi.fn(), state: "idle" as const }),
}));

describe("main", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it("mounts ChatProvider + ChatPage into #root", async () => {
    await import("./main");

    expect(await screen.findByRole("button", { name: "New conversation" })).toBeTruthy();
  });
});
