import type { UIMessage } from "ai";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RetrievalStatus } from "./RetrievalStatus";

const scanCVPart = (overrides: Partial<UIMessage["parts"][number]>) =>
  ({
    type: "tool-scan-cv",
    toolCallId: "call-1",
    state: "input-available",
    input: { query: "react" },
    ...overrides,
  }) as UIMessage["parts"][number];

describe("RetrievalStatus", () => {
  it("shows that the CVs are being searched while the tool call has no result yet", () => {
    render(<RetrievalStatus part={scanCVPart({ state: "input-available" })} />);

    expect(screen.getByText("searching the CVs")).toBeTruthy();
  });

  it("renders nothing once the tool call has produced a result", () => {
    render(<RetrievalStatus part={scanCVPart({ state: "output-available", output: [] })} />);

    expect(screen.queryByText("searching the CVs")).toBeNull();
  });
});
