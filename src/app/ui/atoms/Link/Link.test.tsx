import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Link } from "./Link";

describe("Link", () => {
  it("renders an anchor targeting the given href", () => {
    render(<Link href="/cvs/jane-doe.pdf">Jane Doe</Link>);

    const link = screen.getByRole("link", { name: "Jane Doe" });

    expect(link.getAttribute("href")).toBe("/cvs/jane-doe.pdf");
  });

  it("opens in a new browsing context, without granting it access to window.opener", () => {
    render(<Link href="/cvs/jane-doe.pdf">Jane Doe</Link>);

    const link = screen.getByRole("link", { name: "Jane Doe" });

    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });
});
