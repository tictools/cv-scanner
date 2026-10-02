## Context

`ChatPanel` renders `messages` inside `<Container className={styles["messageList"]}>`, which has
`overflow-y: auto`. Nothing reads or sets its scroll position. The list stays wherever the browser
leaves it, so new answers below the fold go unnoticed and streamed answers are not followed (issue
#17).

Constraints:

- The atomic-design rule bans raw DOM above the atom layer. The organism can only reach the scroll
  element through an atom. `Container` already spreads `...rest` onto its `<div>`, so `onScroll`
  passes through. Its props type is `ComponentPropsWithoutRef<"div">`, though, so a `ref` is not
  accepted by type.
- `ChatConversation` is mounted under `key={sessionId}`. A new conversation already remounts
  `ChatPanel`, which resets any scroll state for free.
- `messages` is supplied by the agent session (`useScannerChat`). A streamed answer re-renders with the
  same last message growing. A new turn appends messages. A reload replays the history after mount.

## Goals / Non-Goals

**Goals:**

- Follow new content while the user is at the bottom. When the user is not at the bottom, flag
  assistant content with an indicator.
- The indicator clears only when the bottom is reached, by click or by manual scroll.
- Testable under jsdom, which has no layout.

**Non-Goals:**

- Unread counts, scroll restoration, virtualization. See the proposal.
- Changes outside `src/app/ui/`.

## Decisions

### 1. Track "at bottom" from scroll events, and decide on each content change

A hook, `useChatScroll`, lives in `src/app/ui/organisms/ChatPanel/hooks/useChatScroll.ts` (the
location `docs/atomic-design.md` §3.3 already sketches). It returns
`{ listRef, onScroll, hasNewMessage, scrollToLatest }`.

- `onScroll` recomputes `isAtBottom` (`scrollHeight - scrollTop - clientHeight <= threshold`) and
  stores it in a ref. When the user reaches the bottom it clears `hasNewMessage`.
- A `useLayoutEffect` keyed on the content signature (see Decision 2) runs after new content is laid
  out but before paint. If the stored `isAtBottom` is true, it scrolls the list to the bottom. If not,
  and the change came from the assistant, it sets `hasNewMessage`. Because the ref holds the position
  from *before* the new content grew the list, a long incoming answer doesn't read as "the user
  scrolled up".
- The threshold is a small private named constant (per `docs/code-conventions.md`). It absorbs
  sub-pixel rounding and zoom, so "at the bottom" doesn't flicker.

*Alternative: an `IntersectionObserver` on a sentinel at the end of the list.* Rejected. It needs an
extra element in the list (one more atom or a raw node), and jsdom doesn't implement it, so every test
would mock an observer instead of setting three numbers. Scroll events give the same signal with less
machinery.

*Alternative: compute "at bottom" inside the effect from the current DOM.* Rejected. By then the new
content has already increased `scrollHeight`, so a user who *was* at the bottom would look scrolled up
and get an indicator instead of autoscroll.

### 2. The change signature is the last message's id plus its part count and text length

The effect has to fire on appended messages *and* on streamed growth of the last one. The dependency
is a cheap value derived from `messages` in render: the last message's `id`, `role`, part count and
total text length. It is not `messages` itself, whose identity may change without visible content
changing.

- The indicator is raised only when the last message's `role` is `"assistant"`.
- A change whose last message is the user's own submitted question always scrolls to the bottom and
  re-engages following, whatever the previous position. The user just acted, so their question should
  be visible and the answer should then be followed (spec scenario "The user submits a question while
  scrolled up").

*Alternative: depend on `messages.length` only.* Rejected. It misses streamed fragments, so a user at
the bottom would watch the answer grow past the fold.

### 3. Activating the indicator scrolls to the bottom. Arrival, not the click, clears it

`scrollToLatest` calls `scrollTo({ top: scrollHeight, behavior })` on the list. `behavior` is
`"smooth"` unless `prefers-reduced-motion: reduce` is set, in which case it is `"auto"`. The indicator
is cleared by the same `onScroll` path that handles manual scrolling, once the list reports the bottom.
There is one clearing rule for both routes, as the issue asks. If the answer is still streaming during
the smooth scroll, the next content change sees `isAtBottom` true and keeps following.

*Alternative: clear `hasNewMessage` immediately on click.* Rejected. It creates a second clearing rule.
If the scroll were interrupted (for example, by the user grabbing the scrollbar), the indicator would
be gone while unseen content remained.

### 4. `Container` accepts a ref; the indicator is a new molecule

- `Container`'s props type moves from `ComponentPropsWithoutRef<"div">` to
  `ComponentPropsWithRef<"div">`. In React 19, `ref` is an ordinary prop on function components, so the
  existing `...rest` spread forwards it without `forwardRef`.
- `NewMessageIndicator` (`src/app/ui/molecules/NewMessageIndicator/`) composes the `Button` atom with
  the label "New message" and a "↓" glyph that is hidden from assistive technology. Its accessible name
  is "New message". Its only prop is `onClick`. Visibility is the organism's choice, made with
  `RenderOrNull` (`docs/atomic-design.md` §4.6).
- `ChatPanel` wraps the message list and the indicator in a positioned `Container`
  (`position: relative`). The indicator's own CSS anchors it bottom-right (`position: absolute`), so it
  floats over the list without shifting layout.

*Alternative: a new `ScrollArea` atom that owns the scroll logic.* Rejected. The behaviour (assistant
vs user messages, the indicator) is chat-specific presentation logic. That belongs in an organism
hook, not in a generic primitive. A ref on `Container` is the smallest change that keeps the
no-raw-DOM rule.

*Alternative: put a `visible` prop on the molecule.* Rejected. It duplicates `RenderOrNull`, which
exists for exactly this.

### 5. Tests drive the scroll geometry directly

jsdom does no layout: `scrollHeight`, `clientHeight` and `scrollTop` are `0`, and `Element.scrollTo` is
not implemented. Hook and organism tests define those three properties on the list element, stub
`scrollTo`, and fire `scroll` events. The scenarios are then asserted as plain state transitions
(indicator shown or hidden, `scrollTo` called or not). Visual placement and real smooth scrolling are
checked by hand in the browser during apply.

## Risks / Trade-offs

- [A content change can land between a user's scroll gesture and its `scroll` event, and be decided
  on a stale `isAtBottom`.] → At worst, one frame of autoscroll or one spurious indicator. The next
  scroll event corrects it. This is acceptable for a chat transcript.
- [Smooth scrolling toward a target that keeps moving while the answer streams.] → Following resumes
  on the next content change once the bottom is reached (Decision 3). With reduced motion the jump is
  instant.
- [History replay on reload arrives after mount, possibly in several batches.] → The list starts empty,
  which counts as "at the bottom", so each batch is followed and no indicator appears.
- [Widening `Container`'s props to accept `ref` touches every atom consumer's types.] → It is additive.
  No existing call site passes a ref, and `ComponentPropsWithRef` is a superset.
