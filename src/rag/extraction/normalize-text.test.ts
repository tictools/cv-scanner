import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalize-text";

describe("normalizeText", () => {
  it("re-joins a short letter-spaced heading", () => {
    expect(normalizeText("P R O F I L E")).toBe("PROFILE");
  });

  it("re-joins a multi-word letter-spaced heading, collapsing the inter-word gap", () => {
    expect(
      normalizeText("P R O F E S S I O N A L   E X P E R I E N C E"),
    ).toBe("PROFESSIONAL EXPERIENCE");
  });

  it("collapses runs of whitespace into single spaces", () => {
    expect(normalizeText("Backend  Engineer\n\nwith   5 years")).toBe(
      "Backend Engineer with 5 years",
    );
  });

  it("leaves ordinary prose unchanged apart from whitespace", () => {
    expect(normalizeText("I am a backend engineer with 5 years of experience.")).toBe(
      "I am a backend engineer with 5 years of experience.",
    );
  });

  it("leaves single-letter words and short initials unchanged", () => {
    expect(normalizeText("Contact: J Smith, a senior engineer")).toBe(
      "Contact: J Smith, a senior engineer",
    );
  });
});
