import { describe, expect, it } from "vitest";

import { SYSTEM_PROMPT } from "./system-prompt";

const SECTION_BOUNDARY = /\n\n(?=\w+ —)/;

const sectionOf = (name: string) =>
  SYSTEM_PROMPT.split(SECTION_BOUNDARY).find((section) => section.startsWith(`${name} —`)) ?? "";

describe("SYSTEM_PROMPT", () => {
  it("states the language contract as its own section, alongside groundedness and scope", () => {
    expect(sectionOf("Groundedness")).not.toBe("");
    expect(sectionOf("Scope")).not.toBe("");
    expect(sectionOf("Language")).not.toBe("");
  });

  it("does not leave the language rule nested inside scope, where it would read as decline-only", () => {
    expect(sectionOf("Scope")).not.toMatch(/language/i);
  });

  it("applies the user's language to every kind of reply, not only to declines", () => {
    const language = sectionOf("Language");

    expect(language).toMatch(/answer/i);
    expect(language).toMatch(/decline/i);
    expect(language).toMatch(/greeting/i);
  });

  it("tells the assistant to mirror the user even when the retrieved CV is written in another language", () => {
    const language = sectionOf("Language");

    expect(language).toMatch(/Catalan/);
    expect(language).toMatch(/Spanish/);
    expect(language).toMatch(/\bnames?\b/i);
  });

  it("follows a mid-conversation language switch", () => {
    expect(sectionOf("Language")).toMatch(/switch/i);
  });
});
