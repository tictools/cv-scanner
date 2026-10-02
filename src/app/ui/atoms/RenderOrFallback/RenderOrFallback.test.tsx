import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RenderOrFallback } from "./RenderOrFallback";

describe("RenderOrFallback", () => {
  it("renders its children, not the fallback, when shouldRender is true", () => {
    render(
      <RenderOrFallback shouldRender fallback={<span>fallback</span>}>
        <span>child</span>
      </RenderOrFallback>,
    );

    expect(screen.getByText("child")).toBeTruthy();
    expect(screen.queryByText("fallback")).toBeNull();
  });

  it("renders the fallback, not its children, when shouldRender is false", () => {
    render(
      <RenderOrFallback shouldRender={false} fallback={<span>fallback</span>}>
        <span>child</span>
      </RenderOrFallback>,
    );

    expect(screen.getByText("fallback")).toBeTruthy();
    expect(screen.queryByText("child")).toBeNull();
  });

  it("does not run the discarded side's component body", () => {
    const childBody = vi.fn(() => null);
    const fallbackBody = vi.fn(() => null);
    const Child = () => childBody();
    const Fallback = () => fallbackBody();

    render(
      <RenderOrFallback shouldRender={false} fallback={<Fallback />}>
        <Child />
      </RenderOrFallback>,
    );

    expect(childBody).not.toHaveBeenCalled();
    expect(fallbackBody).toHaveBeenCalled();
  });
});
