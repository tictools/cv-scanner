import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenderOrNull } from "./RenderOrNull";

describe("RenderOrNull", () => {
  it("renders its children when shouldRender is true", () => {
    render(
      <RenderOrNull shouldRender>
        <span>child</span>
      </RenderOrNull>,
    );

    expect(screen.getByText("child")).toBeTruthy();
  });

  it("renders nothing when shouldRender is false", () => {
    const { container } = render(
      <RenderOrNull shouldRender={false}>
        <span>child</span>
      </RenderOrNull>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("does not run a discarded child component's body", () => {
    const body = vi.fn(() => null);
    const Child = () => body();

    render(
      <RenderOrNull shouldRender={false}>
        <Child />
      </RenderOrNull>,
    );

    expect(body).not.toHaveBeenCalled();
  });
});
