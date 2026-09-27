import { describe, expect, it } from "vitest";
import { photoUrl } from "./photo-url";

describe("photoUrl", () => {
  it("resolves a candidate id to their generated portrait as the app serves it", () => {
    expect(photoUrl("jane-doe")).toBe("/photos/jane-doe.png");
  });
});
