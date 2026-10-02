import type { ReactNode } from "react";

export interface RenderOrFallbackProps {
  shouldRender: boolean;
  children: ReactNode;
  fallback: ReactNode;
}

/**
 * Paints its children or the fallback — an either/or render-tree branch written
 * as composition instead of a ternary or an `if`/`else` inside JSX. Emits no DOM
 * of its own.
 *
 * Evaluation contract (applies to both `children` and `fallback`):
 * - A discarded **component** is safe: its element is created, but its body,
 *   hooks and effects never run — React only mounts what is returned.
 * - A discarded **expression** is not: `transform(x)`, `list.map(...)`,
 *   allocations and the like inside either side's JSX are evaluated before this
 *   helper runs, whatever `shouldRender` says. When a side embeds eager work (or
 *   work that is only valid on the painted side), use a ternary, or move that
 *   work into a component.
 * - In a list, `key` goes on this helper (the map callback's returned root),
 *   not only on the child inside it.
 *
 * @example
 * ```tsx
 * <RenderOrFallback shouldRender={isUser} fallback={<Markdown>{text}</Markdown>}>
 *   <Text>{text}</Text>
 * </RenderOrFallback>
 * ```
 */
export const RenderOrFallback = ({ shouldRender, children, fallback }: RenderOrFallbackProps) =>
  shouldRender ? children : fallback;
