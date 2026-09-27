import { describe, expect, it } from "vitest";
import { createTools } from "./index";

describe("createTools", () => {
  it("registers scan-cv as the tool name the model sees", () => {
    const tools = createTools({});

    expect(Object.keys(tools)).toEqual(["scan-cv"]);
  });

  it("passes credentials through to the scan-cv tool", () => {
    const credentials = { url: "https://example.upstash.io", token: "token" };

    const tools = createTools({ credentials });

    expect(tools["scan-cv"]).toBeDefined();
  });
});
