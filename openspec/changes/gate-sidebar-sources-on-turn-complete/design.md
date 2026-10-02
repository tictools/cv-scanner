## Context

`ChatConversation` renders `<SourcePanel sources={latestAnsweredSources(messages)} />`.
`latestAnsweredSources` walks `messages` backwards and returns the sources of the first message that
has any. `sourcesFromMessage` only counts `scan-cv` parts in `output-available`, so an in-flight call
contributes nothing. But a turn's parts arrive in this order: tool call, tool result, streamed prose. That
means the in-flight assistant message has sources while `useScannerChat`'s `state` is still
`"streaming"`. `SourcePanel` ignores `state`, so it switches early (issue #15).

## Goals / Non-Goals

**Goals:**

- The panel switches to a turn's sources only after that turn leaves `"streaming"`.
- While a turn streams, the panel keeps the previous answered turn's sources rather than clearing.
- The result is deterministic from `(messages, state)`, so a reload and remount still produce the same
  panel.

**Non-Goals:**

- Per-part completion gating, or transition animations. See the proposal.
- Changes to `agent`, `SourcePanel`'s props, or `useScannerChat`'s result shape.

## Decisions

### Gate on the coarse turn state, not per-part completion

Use the `ScannerChatState` that `useScannerChat` already exposes. While it is `"streaming"`, the turn in
flight is excluded from the derivation.

- *Alternative: check every part of the latest message with `getToolPartState`.* Rejected. It
  re-derives what `isStreaming` already says, adds complexity, and text parts have no tool state to
  check anyway.

### A pure derivation that drops the in-flight turn, not a stateful hook

Add `displayedSources(messages, state)` in `src/app/sources/displayed-sources.ts`. When `state` is
`"streaming"`, it ignores every message after the last user message (the turn in flight) and returns
`latestAnsweredSources` over the rest. Otherwise it returns `latestAnsweredSources(messages)` unchanged.
`ChatConversation` calls it in place of `latestAnsweredSources`.

- *Alternative: a `useDisplayedSources` hook that remembers the last sources seen while not
  streaming (`useState`/`useRef`) and holds them during streaming.* Rejected. It adds component state
  that the app's "hooks hold no state of their own" stance avoids. It also needs effect timing to update
  correctly. And it depends on render history, whereas the pure version depends only on its inputs. The
  pure version gives the same visible result, because the previous turn's sources are still in
  `messages`.
- *Alternative: gate inside `SourcePanel` by passing it `state`.* Rejected. The organism would need
  to know about chat state, and could only hide sources, not fall back to the previous turn's.

`"error"` is treated like `"idle"`. A turn that failed after retrieval resolved shows its sources,
consistent with the existing "Retrieval failed" and answer-still-displayed behaviour.

## Risks / Trade-offs

- [The in-flight turn is identified as "after the last user message". An assistant-only message during
  streaming, such as a server-initiated message, would also be hidden until streaming ends.] → That is
  the desired behaviour anyway. Nothing in the agent emits such messages today.
- [`state` comes from `isStreaming`, which can briefly be `false` between the user message and the
  first assistant chunk.] → Harmless. At that moment the in-flight turn has no sources yet, so both
  branches return the same result.
