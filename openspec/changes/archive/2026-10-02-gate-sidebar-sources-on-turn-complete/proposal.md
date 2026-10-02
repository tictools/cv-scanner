## Why

The source panel lists a turn's cited CVs as soon as its `scan-cv` call resolves, while the answer is
still streaming. The sidebar pops in ahead of the text that justifies it (issue #15).

## What Changes

- The source panel switches to a new turn's cited CVs only once that turn stops streaming (`idle` or
  `error`). Until then it keeps showing the previous answered turn's sources, or the empty state if
  there are none.
- The sources displayed are derived from the messages and the chat state together. `ChatConversation`
  stops passing `latestAnsweredSources(messages)` straight to `SourcePanel`.
- `RetrievalStatus`'s in-message "searching the CVs" indicator is unchanged. It stays the live
  retrieval signal.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-sources` (`app` module): the requirement "The source panel lists the cited CVs of the most
  recent answered turn, one per row" now defines an answered turn as one that has finished streaming.
  It gains a scenario for retrieval that resolves while the answer is still streaming.

## Non-goals

- Gating on per-part completion (option 2 in the issue).
- Animating or skeleton-loading the panel (option 3 in the issue). This can follow separately.
- Any change to `agent`, its source extraction, or the `scan-cv` tool.

## Impact

- `src/app/pages/ChatPage/ChatConversation.tsx`: wires the gated sources into `SourcePanel`.
- `src/app/sources/`: a new derivation that takes the chat state into account, next to
  `latest-answered-sources.ts`.
- `src/app/pages/ChatPage/ChatPage.test.tsx`: covers the in-between state.
- No new dependencies and no API changes.
