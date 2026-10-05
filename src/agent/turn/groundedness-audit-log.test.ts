// TODO(add-agent-evals): temporary groundedness audit logging — remove when the Braintrust groundedness scorer lands.
import { afterEach, describe, expect, it, vi } from "vitest";
import { logGroundednessAudit } from "./groundedness-audit-log";

describe("logGroundednessAudit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the question, retrieved candidateIds, and the answer together", () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    logGroundednessAudit({
      question: "who knows FastAPI?",
      candidateIds: ["nikita-crist"],
      answer: "Nikita Crist has FastAPI experience.",
    });

    expect(consoleLog).toHaveBeenCalledTimes(1);

    const [, payload] = consoleLog.mock.calls[0] ?? [];
    expect(JSON.parse(payload as string)).toEqual({
      question: "who knows FastAPI?",
      candidateIds: ["nikita-crist"],
      answer: "Nikita Crist has FastAPI experience.",
    });
  });
});
