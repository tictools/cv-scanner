import type { ReactNode } from "react";

export interface RenderOrNullProps {
  shouldRender: boolean;
  children: ReactNode;
}

/**
 * Paints its children or nothing — a render-tree branch written as composition
 * instead of an early `return null` or a `&&` inside JSX. Emits no DOM of its own.
 *
 * Evaluation contract:
 * - A discarded child **component** is safe: its element is created, but its
 *   body, hooks and effects never run — React only mounts what is returned.
 * - A discarded child **expression** is not: `transform(x)`, `list.map(...)`,
 *   allocations and the like inside the JSX are evaluated before this helper
 *   runs, whatever `shouldRender` says. When the children embed eager work (or
 *   work that is only valid on the painted side), use `&&`, or move that work
 *   into a component.
 * - In a list, `key` goes on this helper (the map callback's returned root),
 *   not only on the child inside it.
 *
 * @example
 * ```tsx
 * <RenderOrNull shouldRender={isToolUIPart(part)}>
 *   <RetrievalStatus part={part} />
 * </RenderOrNull>
 * ```
 */
export const RenderOrNull = ({ shouldRender, children }: RenderOrNullProps) => (shouldRender ? children : null);
