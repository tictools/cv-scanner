import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia; code that reads prefers-reduced-motion needs it defined.
window.matchMedia ??= (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

// jsdom doesn't implement scrollTo on elements; a no-op default lets components that call it
// render without crashing. Tests that assert on scrolling spy on it themselves.
Element.prototype.scrollTo ??= () => {};
