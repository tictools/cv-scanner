import { describe, expect, it } from "vitest";
import { classNames } from "./classNames";

describe("classNames", () => {
  it("joins non-empty string arguments with a single space", () => {
    expect(classNames("button", "button--primary")).toBe("button button--primary");
  });

  it("drops falsy arguments instead of leaving gaps", () => {
    expect(classNames("button", undefined, "", false, null, "button--primary")).toBe("button button--primary");
  });

  it("keeps only the truthy keys of a record argument", () => {
    expect(classNames("badge", { "badge--error": true, "badge--neutral": false })).toBe("badge badge--error");
  });

  it("flattens array arguments recursively", () => {
    expect(classNames(["button", ["button--primary", false]], "extra")).toBe("button button--primary extra");
  });

  it("returns an empty string when every argument is falsy", () => {
    expect(classNames(undefined, false, null, "")).toBe("");
  });
});
